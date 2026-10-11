/**
 * Test result reporting and formatting for Probitas.
 *
 * This package provides multiple reporter implementations for formatting and
 * displaying test execution results. All reporters implement the {@linkcode Reporter}
 * interface from `@probitas-test/runner` and can be passed to `ScenarioRunner.run()`.
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
 * | [@probitas-test/runner](https://www.npmjs.com/package/@probitas-test/runner) | Uses reporters for output |
 * | [probitas](https://github.com/probitas-test/probitas) | CLI that uses these reporters |
 *
 * ## Available Reporters
 *
 * - {@linkcode ListReporter} - Detailed hierarchical output showing scenario and step names
 * - {@linkcode JSONReporter} - JSON output for machine-readable results
 *
 * @example Using ListReporter (default for CLI)
 * ```ts
 * import { ListReporter } from "@probitas-test/reporter";
 *
 * const reporter = new ListReporter();
 * void reporter;
 *
 * // Output example when used with ScenarioRunner:
 * // ● User Registration
 * //   ✓ Create user (15ms)
 * //   ✓ Verify email (23ms)
 * // ● API Integration
 * //   ✓ Authenticate (45ms)
 * //   ✗ Fetch data (102ms)
 * //     Error: Connection timeout
 * ```
 *
 * @example Using JSONReporter for programmatic analysis
 * ```ts
 * import { JSONReporter } from "@probitas-test/reporter";
 *
 * const reporter = new JSONReporter();
 * void reporter;
 *
 * // Output: JSON object with full run details
 * ```
 *
 * @example Configuring reporter options
 * ```ts
 * import { ListReporter } from "@probitas-test/reporter";
 *
 * const reporter = new ListReporter({
 *   output: Deno.stdout.writable,  // Write to stdout instead of stderr
 * });
 * void reporter;
 * ```
 *
 * @module
 */

export * from "./list_reporter.ts";
export * from "./json_reporter.ts";

export type * from "./types.ts";
