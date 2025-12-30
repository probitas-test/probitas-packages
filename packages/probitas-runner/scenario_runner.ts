import type { ScenarioDefinition } from "@probitas/core";
import type {
  Reporter,
  ScenarioResult,
  ScenarioRunOptions,
  StepResult,
} from "./types.ts";
import { Skip } from "./skip.ts";
import { StepRunner } from "./step_runner.ts";
import { toScenarioMetadata } from "./metadata.ts";
import { timeit } from "./utils/timeit.ts";
import { createScenarioContext } from "./context.ts";

/**
 * Executes a single scenario from start to finish.
 *
 * The ScenarioRunner manages:
 * - Resource initialization and disposal with AsyncDisposableStack
 * - Step execution through StepRunner
 * - Step result collection and aggregation
 * - Scenario lifecycle events through the Reporter interface
 *
 * ## Use Cases
 *
 * ### Customization
 * This class can be extended to customize scenario execution behavior:
 * - Override `run()` to add pre/post-processing logic
 * - Modify result aggregation or error handling
 * - Add custom logging or instrumentation
 *
 * ### Worker/Process Isolation
 * ScenarioRunner can be used to run scenarios in isolated Workers or processes:
 * - Execute each scenario in a separate Worker for memory isolation
 * - Prevent cross-scenario contamination and resource leaks
 * - Enable true parallel execution without shared state
 * - The default {@linkcode Runner} runs all scenarios in the same process without isolation
 *
 * @example Basic usage
 * ```ts
 * import { ScenarioRunner } from "@probitas/runner";
 * import type { Reporter } from "@probitas/runner";
 * import type { ScenarioDefinition } from "@probitas/core";
 *
 * const reporter: Reporter = {};
 * const scenario: ScenarioDefinition = {} as ScenarioDefinition;
 * const runner = new ScenarioRunner(reporter);
 *
 * const result = await runner.run(scenario);
 * console.log(result.status); // "passed" | "failed" | "skipped"
 * ```
 *
 * @example Custom scenario runner
 * ```ts
 * import { ScenarioRunner } from "@probitas/runner";
 * import type { Reporter, ScenarioResult, ScenarioRunOptions } from "@probitas/runner";
 * import type { ScenarioDefinition } from "@probitas/core";
 *
 * const reporter: Reporter = {};
 *
 * class CustomScenarioRunner extends ScenarioRunner {
 *   override async run(
 *     scenario: ScenarioDefinition,
 *     options?: ScenarioRunOptions
 *   ): Promise<ScenarioResult> {
 *     // Pre-processing
 *     console.log(`Starting scenario: ${scenario.name}`);
 *
 *     // Execute scenario
 *     const result = await super.run(scenario, options);
 *
 *     // Post-processing
 *     if (result.status === "failed") {
 *       console.error(`Scenario failed: ${result.error}`);
 *     }
 *
 *     return result;
 *   }
 * }
 *
 * const runner = new CustomScenarioRunner(reporter);
 * console.log(runner);
 * ```
 */
export class ScenarioRunner {
  #reporter: Reporter;

  /**
   * Create a new ScenarioRunner with the given reporter.
   *
   * @param reporter - Reporter instance for lifecycle events
   */
  constructor(reporter: Reporter) {
    this.#reporter = reporter;
  }

  /**
   * Execute a single scenario and return the result.
   *
   * Emits events through the Reporter:
   * 1. `onScenarioStart` - Before execution starts
   * 2. For each step:
   *    - Delegates to StepRunner for step-level execution
   *    - StepRunner emits `onStepStart` and `onStepEnd` events
   * 3. `onScenarioEnd` - After scenario completes with ScenarioResult
   *
   * Resources are automatically cleaned up via AsyncDisposableStack,
   * even when steps fail or the scenario is aborted.
   *
   * @param scenario - Scenario definition to execute
   * @param options - Execution options (signal for cancellation)
   * @returns Result with status, duration, and step results
   */
  async run(
    scenario: ScenarioDefinition,
    { signal }: ScenarioRunOptions = {},
  ): Promise<ScenarioResult> {
    const metadata = toScenarioMetadata(scenario);
    this.#reporter.onScenarioStart?.(metadata);
    const stepResults: StepResult[] = [];
    const result = await timeit(() => this.#run(scenario, stepResults, signal));
    const scenarioResult: ScenarioResult = result.status === "passed"
      ? {
        status: "passed",
        duration: result.duration,
        metadata,
        steps: stepResults,
      }
      : {
        status: result.error instanceof Skip ? "skipped" : "failed",
        duration: result.duration,
        metadata,
        steps: stepResults,
        error: result.error,
      };
    this.#reporter.onScenarioEnd?.(metadata, scenarioResult);
    return scenarioResult;
  }

  async #run(
    scenario: ScenarioDefinition,
    stepResults: StepResult[],
    signal?: AbortSignal,
  ): Promise<void> {
    await using stack = new AsyncDisposableStack();

    const scenarioCtx = createScenarioContext(scenario, signal);
    const scenarioMetadata = toScenarioMetadata(scenario);
    const stepRunner = new StepRunner(
      this.#reporter,
      scenarioMetadata,
      scenarioCtx,
    );

    for (const step of scenario.steps) {
      signal?.throwIfAborted();

      const stepResult = await stepRunner.run(step, stack);
      stepResults.push(stepResult);

      if (stepResult.status !== "passed") {
        throw stepResult.error;
      }
    }
  }
}
