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
import { StepTimeoutError } from "./errors.ts";

const DEFAULT_STEP_TIMEOUT = 30000;
const DEFAULT_STEP_RETRY_MAX_ATTEMPTS = 1;
const DEFAULT_STEP_RETRY_BACKOFF = "linear" as const;

type ResourceStep<T> = StepDefinition<T> & { kind: "resource" };
type SetupStep = StepDefinition<SetupCleanup> & { kind: "setup" };
type ExecutionStep<T> = StepDefinition<T> & { kind: "step" };

/**
 * Error with retry metadata attached
 * @internal
 */
interface ErrorWithRetryMetadata extends Error {
  __retryAttemptNumber?: number;
}

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

    const signal = mergeSignals(
      ctx.signal,
      AbortSignal.timeout(timeout),
    );
    const result = await timeit(() => {
      return retry(
        () => deadline(this.#run(ctx, step, stack), timeout, { signal }),
        {
          ...retryConfig,
          signal,
        },
      );
    });

    // Enrich timeout errors with retry context and elapsed time
    let error = result.status === "failed" ? result.error : undefined;
    if (error && isTimeoutError(error)) {
      const attemptNumber =
        (error as ErrorWithRetryMetadata).__retryAttemptNumber ?? 1;
      error = new StepTimeoutError(
        step.name,
        timeout,
        attemptNumber,
        result.duration,
        { cause: error },
      );
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

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}
