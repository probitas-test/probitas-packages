import { chunk } from "@std/collections/chunk";
import type { ScenarioDefinition, StepOptions } from "@probitas/core";
import type {
  Reporter,
  RunOptions,
  RunResult,
  ScenarioResult,
} from "./types.ts";
import { ScenarioRunner } from "./scenario_runner.ts";
import { toScenarioMetadata } from "./metadata.ts";
import { timeit } from "./utils/timeit.ts";
import { mergeSignals } from "./utils/signal.ts";
import { ScenarioTimeoutError, StepTimeoutError } from "./errors.ts";

/**
 * Top-level test runner that orchestrates execution of multiple scenarios.
 *
 * The Runner manages:
 * - Parallel execution with concurrency control (`maxConcurrency`)
 * - Early stopping on failures (`maxFailures`)
 * - Test lifecycle events through the Reporter interface
 * - Aggregated results in RunResult
 *
 * @example
 * ```ts
 * import { Runner } from "@probitas/runner";
 * import type { Reporter } from "@probitas/runner";
 * import type { ScenarioDefinition } from "@probitas/core";
 *
 * const reporter: Reporter = {};
 * const scenarios: ScenarioDefinition[] = [];
 * const runner = new Runner(reporter);
 *
 * const result = await runner.run(scenarios, {
 *   maxConcurrency: 4,
 *   maxFailures: 1,
 * });
 * console.log(result);
 * ```
 */
export class Runner {
  /**
   * Create a new Runner with the given reporter.
   *
   * @param reporter - Reporter instance for lifecycle events
   */
  constructor(readonly reporter: Reporter) {}

  /**
   * Execute all scenarios and return aggregated results.
   *
   * Emits events through the Reporter:
   * 1. `onRunStart` - Before execution starts
   * 2. For each scenario (concurrently):
   *    - Delegates to ScenarioRunner for scenario-level execution
   *    - ScenarioRunner emits scenario and step level events
   * 3. `onRunEnd` - After all scenarios complete with RunResult
   *
   * @param scenarios - Scenarios to execute
   * @param options - Execution options (maxConcurrency, maxFailures, signal)
   * @returns Aggregated results with pass/fail/skip counts
   */
  async run(
    scenarios: readonly ScenarioDefinition[],
    options?: RunOptions,
  ): Promise<RunResult> {
    const scenariosMetadata = scenarios.map(toScenarioMetadata);
    await this.reporter.onRunStart?.(scenariosMetadata);

    // Create abort controller for outer context
    const controller = new AbortController();
    const { signal } = controller;
    options?.signal?.addEventListener("abort", () => controller.abort());

    // Execute scenarios
    const maxConcurrency = options?.maxConcurrency ?? 0;
    const maxFailures = options?.maxFailures ?? 0;
    const timeout = options?.timeout ?? 0;

    const scenarioResults: ScenarioResult[] = [];
    const result = await timeit(() =>
      this.#run(
        scenarios,
        scenarioResults,
        maxConcurrency,
        maxFailures,
        timeout,
        signal,
        options?.stepOptions,
      )
    );

    // Calculate summary
    const total = scenarios.length;
    const passed = scenarioResults.filter((r) => r.status === "passed").length;
    const failed = scenarioResults.filter((r) => r.status === "failed").length;
    const skipped = total - passed - failed;
    const runResult: RunResult = {
      total,
      passed,
      failed,
      skipped,
      duration: result.duration,
      scenarios: scenarioResults,
    };

    await this.reporter.onRunEnd?.(scenariosMetadata, runResult);

    return runResult;
  }

  async #runWithTimeout(
    scenarioRunner: ScenarioRunner,
    scenario: ScenarioDefinition,
    timeout: number,
    signal?: AbortSignal,
  ): Promise<ScenarioResult> {
    const timeoutSignal = mergeSignals(
      signal,
      AbortSignal.timeout(timeout),
    );

    const result = await timeit(() =>
      scenarioRunner.run(scenario, { signal: timeoutSignal })
    );

    // Handle timeit result
    if (result.status === "failed") {
      // timeit itself failed (this should be rare)
      throw result.error;
    }

    const scenarioResult = result.value;

    // Check if scenario failed due to timeout
    if (
      scenarioResult.status === "failed" &&
      isTimeoutError(scenarioResult.error)
    ) {
      return {
        ...scenarioResult,
        error: new ScenarioTimeoutError(
          scenario.name,
          timeout,
          result.duration,
          { cause: scenarioResult.error },
        ),
      };
    }

    return scenarioResult;
  }

  async #run(
    scenarios: readonly ScenarioDefinition[],
    scenarioResults: ScenarioResult[],
    maxConcurrency: number,
    maxFailures: number,
    timeout: number,
    signal?: AbortSignal,
    stepOptions?: StepOptions,
  ): Promise<void> {
    // Parallel execution with concurrency control
    // maxConcurrency=1 means sequential execution
    const concurrency = maxConcurrency || scenarios.length;
    const scenarioRunner = new ScenarioRunner(this.reporter, stepOptions);

    let failureCount = 0;
    for (const batch of chunk(scenarios, concurrency)) {
      signal?.throwIfAborted();
      await Promise.all(
        batch.map(async (scenario: ScenarioDefinition) => {
          signal?.throwIfAborted();

          // Execute scenario with optional timeout
          const scenarioResult = timeout > 0
            ? await this.#runWithTimeout(
              scenarioRunner,
              scenario,
              timeout,
              signal,
            )
            : await scenarioRunner.run(scenario, { signal });

          scenarioResults.push(scenarioResult);
          if (scenarioResult.status === "failed") {
            failureCount++;
            if (maxFailures !== 0 && failureCount >= maxFailures) {
              throw scenarioResult.error;
            }
          }
        }),
      );
    }
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "TimeoutError") ||
    error instanceof StepTimeoutError
  );
}
