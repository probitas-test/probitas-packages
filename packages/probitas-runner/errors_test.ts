import { expect } from "@std/expect";
import { delay } from "@std/async/delay";
import { ScenarioTimeoutError, StepTimeoutError } from "./errors.ts";

Deno.test("ScenarioTimeoutError - constructor creates error with correct properties", () => {
  const error = new ScenarioTimeoutError("test-scenario", 5000, 5100);

  expect(error.name).toBe("ScenarioTimeoutError");
  expect(error.scenarioName).toBe("test-scenario");
  expect(error.timeoutMs).toBe(5000);
  expect(error.elapsedMs).toBe(5100);
  expect(error.currentStepName).toBeUndefined();
  expect(error.currentStepIndex).toBeUndefined();
  expect(error.message).toBe(
    'Scenario "test-scenario" timed out after 5000ms, total elapsed: 5100ms',
  );
});

Deno.test("ScenarioTimeoutError - constructor with step information", () => {
  const error = new ScenarioTimeoutError("test-scenario", 5000, 5100, {
    currentStepName: "slow-step",
    currentStepIndex: 2,
  });

  expect(error.currentStepName).toBe("slow-step");
  expect(error.currentStepIndex).toBe(2);
  expect(error.message).toBe(
    'Scenario "test-scenario" timed out after 5000ms while executing step "slow-step" (step 3), total elapsed: 5100ms',
  );
});

Deno.test("ScenarioTimeoutError - constructor with only step name", () => {
  const error = new ScenarioTimeoutError("test-scenario", 5000, 5000, {
    currentStepName: "slow-step",
  });

  expect(error.currentStepName).toBe("slow-step");
  expect(error.currentStepIndex).toBeUndefined();
  expect(error.message).toBe(
    'Scenario "test-scenario" timed out after 5000ms while executing step "slow-step"',
  );
});

Deno.test("ScenarioTimeoutError.timeoutSignal - creates signal that aborts after timeout", async () => {
  using signal = ScenarioTimeoutError.timeoutSignal(50, {
    scenarioName: "test-scenario",
  });

  expect(signal.aborted).toBe(false);

  await delay(100);

  expect(signal.aborted).toBe(true);
  expect(signal.reason).toBeInstanceOf(ScenarioTimeoutError);

  const error = signal.reason as ScenarioTimeoutError;
  expect(error.scenarioName).toBe("test-scenario");
  expect(error.timeoutMs).toBe(50);
  expect(error.elapsedMs).toBeGreaterThanOrEqual(50);
  expect(error.elapsedMs).toBeLessThan(200);
});

Deno.test("ScenarioTimeoutError.timeoutSignal - cleanup via dispose", async () => {
  const signal = ScenarioTimeoutError.timeoutSignal(1000, {
    scenarioName: "test-scenario",
  });

  expect(signal.aborted).toBe(false);

  // Dispose immediately to cleanup timer
  signal[Symbol.dispose]();

  await delay(50);

  // Should not abort because timer was cleaned up
  expect(signal.aborted).toBe(false);
});

Deno.test("ScenarioTimeoutError.timeoutSignal - cleanup via using declaration", async () => {
  {
    using signal = ScenarioTimeoutError.timeoutSignal(1000, {
      scenarioName: "test-scenario",
    });

    expect(signal.aborted).toBe(false);
  } // signal is disposed here

  await delay(50);

  // Timer should be cleaned up, no leak
});

Deno.test("StepTimeoutError - constructor creates error with correct properties", () => {
  const error = new StepTimeoutError("test-step", 3000, 2, 3200);

  expect(error.name).toBe("StepTimeoutError");
  expect(error.stepName).toBe("test-step");
  expect(error.timeoutMs).toBe(3000);
  expect(error.attemptNumber).toBe(2);
  expect(error.elapsedMs).toBe(3200);
  expect(error.message).toBe(
    'Step "test-step" timed out after 3000ms (attempt 2), total elapsed: 3200ms',
  );
});

Deno.test("StepTimeoutError - constructor for first attempt", () => {
  const error = new StepTimeoutError("test-step", 3000, 1, 3000);

  expect(error.attemptNumber).toBe(1);
  expect(error.message).toBe(
    'Step "test-step" timed out after 3000ms',
  );
});

Deno.test("StepTimeoutError.timeoutSignal - creates signal that aborts after timeout", async () => {
  using signal = StepTimeoutError.timeoutSignal(50, {
    stepName: "test-step",
    attemptNumber: 1,
  });

  expect(signal.aborted).toBe(false);

  await delay(100);

  expect(signal.aborted).toBe(true);
  expect(signal.reason).toBeInstanceOf(StepTimeoutError);

  const error = signal.reason as StepTimeoutError;
  expect(error.stepName).toBe("test-step");
  expect(error.timeoutMs).toBe(50);
  expect(error.attemptNumber).toBe(1);
  expect(error.elapsedMs).toBeGreaterThanOrEqual(50);
  expect(error.elapsedMs).toBeLessThan(200);
});

Deno.test("StepTimeoutError.timeoutSignal - cleanup via dispose", async () => {
  const signal = StepTimeoutError.timeoutSignal(1000, {
    stepName: "test-step",
    attemptNumber: 1,
  });

  expect(signal.aborted).toBe(false);

  // Dispose immediately to cleanup timer
  signal[Symbol.dispose]();

  await delay(50);

  // Should not abort because timer was cleaned up
  expect(signal.aborted).toBe(false);
});

Deno.test("StepTimeoutError.timeoutSignal - measures elapsed time correctly", async () => {
  using signal = StepTimeoutError.timeoutSignal(50, {
    stepName: "test-step",
    attemptNumber: 1,
  });

  await delay(100);

  const error = signal.reason as StepTimeoutError;
  // Elapsed time should be approximately 50ms (actual timeout duration)
  // with some tolerance for timer precision
  expect(error.elapsedMs).toBeGreaterThanOrEqual(50);
  expect(error.elapsedMs).toBeLessThan(150);
});
