/**
 * Test execution and orchestration engine for Probitas scenarios.
 *
 * This package provides the {@linkcode ScenarioRunner} class that executes
 * scenario definitions built with `@probitas-test/builder`. It handles the complete
 * test lifecycle including resource initialization, setup/cleanup hooks,
 * step execution with retry logic, and result reporting.
 *
 * ## Links
 *
 * - [GitHub Repository](https://github.com/probitas-test/probitas)
 * - [@probitas-test/probitas](https://www.npmjs.com/package/@probitas-test/probitas) - Main package (recommended for most users)
 *
 * ## Related Packages
 *
 * | Package | Description |
 * |---------|-------------|
 * | [@probitas-test/builder](https://www.npmjs.com/package/@probitas-test/builder) | Build scenario definitions to execute |
 * | [@probitas-test/core](https://www.npmjs.com/package/@probitas-test/core) | Core type definitions |
 * | [@probitas-test/reporter](https://www.npmjs.com/package/@probitas-test/reporter) | Output formatters for results |
 * | [probitas](https://github.com/probitas-test/probitas) | CLI that uses these reporters |
 *
 * ## Key Features
 *
 * - **Concurrent execution**: Run multiple scenarios in parallel with configurable concurrency
 * - **Failure control**: Stop after N failures or continue through all tests
 * - **Resource lifecycle**: Automatic initialization and disposal of resources
 * - **Retry logic**: Built-in retry with linear/exponential backoff strategies
 * - **Reporter integration**: Pluggable reporters for custom output formatting
 * - **Abort support**: Cancel running tests via AbortSignal
 *
 * ## Core Exports
 *
 * - {@linkcode ScenarioRunner} - Main class for executing scenarios
 * - {@linkcode Skip} - Exception class to skip scenarios conditionally
 * - {@linkcode Reporter} - Interface for observing test execution events
 * - {@linkcode RunOptions} - Configuration options for test runs
 * - {@linkcode RunResult} - Aggregated results from a test run
 * - {@linkcode ScenarioResult} - Result from executing a single scenario
 * - {@linkcode StepResult} - Result from executing a single step
 *
 * ## Error Types
 *
 * - {@linkcode StepTimeoutError} - Thrown when a step exceeds its timeout
 * - {@linkcode ScenarioTimeoutError} - Thrown when a scenario exceeds its timeout
 *
 * @example Basic usage
 * ```ts
 * import { Runner } from "@probitas-test/runner";
 * import type { Reporter } from "@probitas-test/runner";
 * import type { ScenarioDefinition } from "@probitas-test/core";
 *
 * const loadScenarios = (_patterns: string[]): ScenarioDefinition[] => [];
 *
 * const reporter: Reporter = {};
 * const scenarios = loadScenarios(["./tests/*.probitas.ts"]);
 * const runner = new Runner(reporter);
 *
 * const summary = await runner.run(scenarios, {
 *   maxConcurrency: 4,   // Run 4 scenarios in parallel
 *   maxFailures: 5,      // Stop after 5 failures
 * });
 *
 * console.log(`Passed: ${summary.passed}, Failed: ${summary.failed}`);
 * ```
 *
 * @example Using Skip for conditional execution
 * ```ts
 * import { scenario } from "@probitas-test/builder";
 * import { Skip } from "@probitas-test/runner";
 *
 * const tryConnect = (): { query(sql: string): Promise<void> } | null => null;
 *
 * const def = scenario("Database Integration Test")
 *   .resource("db", () => {
 *     const connection = tryConnect();
 *     if (!connection) {
 *       throw new Skip("Database not available");
 *     }
 *     return connection;
 *   })
 *   .step("Run queries", async (ctx) => {
 *     // This only runs if database is available
 *     await ctx.resources.db.query("SELECT 1");
 *   })
 *   .build();
 * console.log(def.name);
 * ```
 *
 * @example Implementing a custom reporter
 * ```ts
 * import type { Reporter, ScenarioResult, RunResult } from "@probitas-test/runner";
 * import type { ScenarioMetadata } from "@probitas-test/core";
 *
 * class MinimalReporter implements Reporter {
 *   onScenarioEnd(scenario: ScenarioMetadata, result: ScenarioResult) {
 *     const icon = result.status === "passed" ? "+" : "-";
 *     console.log(`${icon} ${scenario.name}`);
 *   }
 *
 *   onRunEnd(_scenarios: readonly ScenarioMetadata[], summary: RunResult) {
 *     console.log(`\n${summary.passed}/${summary.total} passed`);
 *   }
 * }
 * console.log(MinimalReporter);
 * ```
 *
 * @example Cancelling a test run
 * ```ts
 * import { Runner } from "@probitas-test/runner";
 * import type { Reporter } from "@probitas-test/runner";
 * import type { ScenarioDefinition } from "@probitas-test/core";
 *
 * const reporter: Reporter = {};
 * const scenarios: ScenarioDefinition[] = [];
 *
 * const controller = new AbortController();
 * const runner = new Runner(reporter);
 *
 * // Cancel after 30 seconds
 * const timeoutId = setTimeout(() => controller.abort(), 30000);
 *
 * const summary = await runner.run(scenarios, {
 *   signal: controller.signal,
 * });
 * clearTimeout(timeoutId);
 * console.log(summary);
 * ```
 *
 * @module
 */

export type * from "./types.ts";
export { Skip } from "./skip.ts";
export { Runner } from "./runner.ts";
export { toScenarioMetadata, toStepMetadata } from "./metadata.ts";
export { ScenarioTimeoutError, StepTimeoutError } from "./errors.ts";
