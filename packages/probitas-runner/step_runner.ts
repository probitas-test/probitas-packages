import { deadline } from "@std/async/deadline";
import type {
  ScenarioMetadata,
  SetupCleanup,
  StepContext,
  StepDefinition,
  StepOptions,
} from "@probitas/core";
import type { Reporter, ScenarioContext, StepResult } from "./types.ts";
import { toStepMetadata } from "./metadata.ts";
import { timeit } from "./utils/timeit.ts";
import { retry } from "./utils/retry.ts";
import { createStepContext } from "./context.ts";
import { mergeSignals } from "./utils/signal.ts";
import { Skip } from "./skip.ts";
import { ScenarioTimeoutError, StepTimeoutError } from "./errors.ts";

const DEFAULT_STEP_TIMEOUT = 30000;
const DEFAULT_STEP_RETRY_MAX_ATTEMPTS = 1;
const DEFAULT_STEP_RETRY_BACKOFF = "linear" as const;

type ResourceStep<T> = StepDefinition<T> & { kind: "resource" };
type SetupStep = StepDefinition<SetupCleanup> & { kind: "setup" };
type ExecutionStep<T> = StepDefinition<T> & { kind: "step" };

export class StepRunner {
  #reporter: Reporter;
  #scenarioMetadata: ScenarioMetadata;
  #scenarioCtx: ScenarioContext;
  #stepOptions?: StepOptions;

  constructor(
    reporter: Reporter,
    scenarioMetadata: ScenarioMetadata,
    scenarioCtx: ScenarioContext,
    stepOptions?: StepOptions,
  ) {
    this.#reporter = reporter;
    this.#scenarioMetadata = scenarioMetadata;
    this.#scenarioCtx = scenarioCtx;
    this.#stepOptions = stepOptions;
  }

  async run(
    step: StepDefinition,
    stack: AsyncDisposableStack,
  ): Promise<StepResult> {
    const ctx = createStepContext(this.#scenarioCtx);
    const stepMetadata = toStepMetadata(step);
    this.#reporter.onStepStart?.(this.#scenarioMetadata, stepMetadata);

    // Resolve timeout and retry with config stepOptions if needed
    const timeout = this.#resolveTimeout(step);
    const retryConfig = this.#resolveRetry(step);

    const result = await timeit(() => {
      return retry(
        async (attempt) => {
          // Create timeout signal for each retry attempt
          using attemptTimeoutSignal = StepTimeoutError.timeoutSignal(timeout, {
            stepName: step.name,
            attemptNumber: attempt,
          });
          const attemptSignal = mergeSignals(ctx.signal, attemptTimeoutSignal);

          // Create attempt-specific context with timeout signal
          const attemptCtx = { ...ctx, signal: attemptSignal };

          return await deadline(
            this.#run(attemptCtx, step, stack),
            timeout,
            { signal: attemptSignal },
          );
        },
        {
          ...retryConfig,
          signal: ctx.signal, // For canceling retry delays only
          shouldRetry: (error) => {
            // Don't retry on timeout errors - they indicate the operation is too slow
            // for the configured timeout, so retrying with the same timeout will fail again.
            if (
              error instanceof StepTimeoutError ||
              error instanceof ScenarioTimeoutError
            ) {
              return false;
            }
            return true;
          },
        },
      );
    });

    // Process timeout errors
    let error = result.status === "failed" ? result.error : undefined;
    if (error) {
      // Check for ScenarioTimeoutError first (from signal or thrown)
      if (
        error instanceof ScenarioTimeoutError ||
        ctx.signal?.reason instanceof ScenarioTimeoutError
      ) {
        // Use the error with step info if available, otherwise enrich it
        const scenarioError = error instanceof ScenarioTimeoutError
          ? error
          : ctx.signal!.reason as ScenarioTimeoutError;

        // If not already enriched with step info, add current step name
        if (!scenarioError.currentStepName) {
          error = new ScenarioTimeoutError(
            scenarioError.scenarioName,
            scenarioError.timeoutMs,
            scenarioError.elapsedMs,
            {
              cause: scenarioError,
              currentStepName: step.name,
            },
          );
        } else {
          // Already enriched, use as-is
          error = scenarioError;
        }
      } else if (error instanceof StepTimeoutError) {
        // Already enriched StepTimeoutError from signal
        // Just update duration
        error = new StepTimeoutError(
          error.stepName,
          error.timeoutMs,
          error.attemptNumber,
          result.duration,
          { cause: error },
        );
      } else if ((error as Error).cause instanceof StepTimeoutError) {
        // StepTimeoutError wrapped in another error (e.g., from signal abort)
        const cause = (error as Error).cause as StepTimeoutError;
        error = new StepTimeoutError(
          cause.stepName,
          cause.timeoutMs,
          cause.attemptNumber,
          result.duration,
          { cause },
        );
      }
    }

    const stepResult: StepResult = result.status === "passed"
      ? {
        status: "passed",
        value: result.value,
        duration: result.duration,
        metadata: stepMetadata,
      }
      : {
        status: error instanceof Skip ? "skipped" : "failed",
        error: error!,
        duration: result.duration,
        metadata: stepMetadata,
      };
    this.#reporter.onStepEnd?.(
      this.#scenarioMetadata,
      stepMetadata,
      stepResult,
    );
    return stepResult;
  }

  async #run<T = unknown>(
    ctx: StepContext,
    step: StepDefinition<T>,
    stack: AsyncDisposableStack,
  ): Promise<T> {
    switch (step.kind) {
      case "resource": {
        return await this.#runResourceStep(ctx, step as ResourceStep<T>, stack);
      }
      case "setup": {
        return await this.#runSetupStep(ctx, step as SetupStep, stack) as T;
      }
      case "step": {
        return await this.#runExecutionStep(ctx, step as ExecutionStep<T>);
      }
    }
  }

  async #runResourceStep<T = unknown>(
    ctx: StepContext,
    step: ResourceStep<T>,
    stack: AsyncDisposableStack,
  ): Promise<T> {
    const resource = await step.fn(ctx);
    if (isDisposable(resource)) {
      stack.use(resource);
    }
    this.#scenarioCtx.resources[step.name] = resource;
    return resource;
  }

  async #runSetupStep(
    ctx: StepContext,
    step: SetupStep,
    stack: AsyncDisposableStack,
  ): Promise<undefined> {
    const cleanup = await step.fn(ctx);
    if (cleanup) {
      if (typeof cleanup === "function") {
        stack.defer(cleanup);
      } else if (isDisposable(cleanup)) {
        stack.use(cleanup);
      }
    }
  }

  async #runExecutionStep<T>(
    ctx: StepContext,
    step: ExecutionStep<T>,
  ): Promise<T> {
    const value = await step.fn(ctx);
    this.#scenarioCtx.results.push(value);
    return value;
  }

  /**
   * Resolve timeout with config and defaults.
   *
   * Priority: step timeout > config timeout > default timeout
   */
  #resolveTimeout(step: StepDefinition): number {
    return step.timeout ??
      this.#stepOptions?.timeout ??
      DEFAULT_STEP_TIMEOUT;
  }

  /**
   * Resolve retry config with config and defaults.
   *
   * Priority: step retry > config retry > default retry
   */
  #resolveRetry(
    step: StepDefinition,
  ): { maxAttempts: number; backoff: "linear" | "exponential" } {
    const maxAttempts = step.retry?.maxAttempts ??
      this.#stepOptions?.retry?.maxAttempts ??
      DEFAULT_STEP_RETRY_MAX_ATTEMPTS;

    const backoff = step.retry?.backoff ??
      this.#stepOptions?.retry?.backoff ??
      DEFAULT_STEP_RETRY_BACKOFF;

    return { maxAttempts, backoff };
  }
}

function isDisposable(x: unknown): x is Disposable | AsyncDisposable {
  return (
    x != null && typeof x === "object" &&
    (Symbol.asyncDispose in x || Symbol.dispose in x)
  );
}
