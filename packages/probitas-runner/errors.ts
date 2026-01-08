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

  /**
   * Creates an AbortSignal that aborts with StepTimeoutError after the specified timeout.
   *
   * @param timeout - Timeout duration in milliseconds
   * @param params - Step information for the error
   * @returns AbortSignal with Disposable interface for cleanup
   */
  static timeoutSignal(
    timeout: number,
    params: {
      stepName: string;
      attemptNumber: number;
    },
  ): AbortSignal & Disposable {
    const controller = new AbortController();
    const startTime = performance.now();
    const timeoutId = setTimeout(() => {
      const elapsedMs = Math.round(performance.now() - startTime);
      const error = new StepTimeoutError(
        params.stepName,
        timeout,
        params.attemptNumber,
        elapsedMs,
      );
      controller.abort(error);
    }, timeout);

    // Cleanup timeout when signal is aborted by other means
    controller.signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
    }, { once: true });

    // Add Disposable interface for manual cleanup
    return Object.assign(controller.signal, {
      [Symbol.dispose]: () => {
        clearTimeout(timeoutId);
      },
    });
  }
}

/**
 * Error thrown when a scenario execution times out.
 *
 * Contains structured information about the timeout including
 * the scenario name, timeout duration, total elapsed time,
 * and optionally the step being executed when timeout occurred.
 */
export class ScenarioTimeoutError extends Error {
  override readonly name = "ScenarioTimeoutError";
  readonly scenarioName: string;
  readonly timeoutMs: number;
  readonly elapsedMs: number;
  readonly currentStepName?: string;
  readonly currentStepIndex?: number;

  constructor(
    scenarioName: string,
    timeoutMs: number,
    elapsedMs: number,
    options?: ErrorOptions & {
      currentStepName?: string;
      currentStepIndex?: number;
    },
  ) {
    const stepMsg = options?.currentStepName
      ? ` while executing step "${options.currentStepName}"${
        options.currentStepIndex !== undefined
          ? ` (step ${options.currentStepIndex + 1})`
          : ""
      }`
      : "";
    const elapsedMsg = elapsedMs !== timeoutMs
      ? `, total elapsed: ${elapsedMs}ms`
      : "";
    super(
      `Scenario "${scenarioName}" timed out after ${timeoutMs}ms${stepMsg}${elapsedMsg}`,
      options,
    );
    this.scenarioName = scenarioName;
    this.timeoutMs = timeoutMs;
    this.elapsedMs = elapsedMs;
    this.currentStepName = options?.currentStepName;
    this.currentStepIndex = options?.currentStepIndex;
  }

  /**
   * Creates an AbortSignal that aborts with ScenarioTimeoutError after the specified timeout.
   *
   * @param timeout - Timeout duration in milliseconds
   * @param params - Scenario information for the error
   * @returns AbortSignal with Disposable interface for cleanup
   */
  static timeoutSignal(
    timeout: number,
    params: {
      scenarioName: string;
    },
  ): AbortSignal & Disposable {
    const controller = new AbortController();
    const startTime = performance.now();
    const timeoutId = setTimeout(() => {
      const elapsedMs = Math.round(performance.now() - startTime);
      const error = new ScenarioTimeoutError(
        params.scenarioName,
        timeout,
        elapsedMs,
      );
      controller.abort(error);
    }, timeout);

    // Cleanup timeout when signal is aborted by other means
    controller.signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
    }, { once: true });

    // Add Disposable interface for manual cleanup
    return Object.assign(controller.signal, {
      [Symbol.dispose]: () => {
        clearTimeout(timeoutId);
      },
    });
  }
}
