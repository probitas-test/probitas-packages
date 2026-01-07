/**
 * Error thrown when a step execution times out.
 *
 * Contains structured information about the timeout including
 * the step name, timeout duration, retry context, and total elapsed time.
 */
export class StepTimeoutError extends Error {
  override readonly name = "StepTimeoutError";
  readonly stepName: string;
  readonly timeoutMs: number;
  readonly attemptNumber: number;
  readonly elapsedMs: number;

  constructor(
    stepName: string,
    timeoutMs: number,
    attemptNumber: number,
    elapsedMs: number,
    options?: ErrorOptions,
  ) {
    const attemptMsg = attemptNumber > 1 ? ` (attempt ${attemptNumber})` : "";
    const elapsedMsg = elapsedMs !== timeoutMs
      ? `, total elapsed: ${elapsedMs}ms`
      : "";
    super(
      `Step "${stepName}" timed out after ${timeoutMs}ms${attemptMsg}${elapsedMsg}`,
      options,
    );
    this.stepName = stepName;
    this.timeoutMs = timeoutMs;
    this.attemptNumber = attemptNumber;
    this.elapsedMs = elapsedMs;
  }
}

/**
 * Error thrown when a scenario execution times out.
 *
 * Contains structured information about the timeout including
 * the scenario name, timeout duration, and total elapsed time.
 */
export class ScenarioTimeoutError extends Error {
  override readonly name = "ScenarioTimeoutError";
  readonly scenarioName: string;
  readonly timeoutMs: number;
  readonly elapsedMs: number;

  constructor(
    scenarioName: string,
    timeoutMs: number,
    elapsedMs: number,
    options?: ErrorOptions,
  ) {
    const elapsedMsg = elapsedMs !== timeoutMs
      ? `, total elapsed: ${elapsedMs}ms`
      : "";
    super(
      `Scenario "${scenarioName}" timed out after ${timeoutMs}ms${elapsedMsg}`,
      options,
    );
    this.scenarioName = scenarioName;
    this.timeoutMs = timeoutMs;
    this.elapsedMs = elapsedMs;
  }
}
