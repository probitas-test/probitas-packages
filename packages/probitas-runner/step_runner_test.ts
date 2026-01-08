import { expect } from "@std/expect";
import { raise } from "@core/errorutil/raise";
import { assertSpyCalls, spy, type SpyLike } from "@std/testing/mock";
import {
  createTestScenario,
  createTestScenarioContext,
  createTestStep,
  TestReporter,
} from "./_testutils.ts";
import { StepRunner } from "./step_runner.ts";
import { StepTimeoutError } from "./errors.ts";

const reporter = new TestReporter();
const scenario = createTestScenario();

Deno.test("StepRunner run runs resource step", async () => {
  await using stack = new AsyncDisposableStack();
  const scenarioCtx = createTestScenarioContext(scenario);
  const runner = new StepRunner(
    reporter,
    scenario,
    scenarioCtx,
  );
  const step = createTestStep({
    kind: "resource",
    name: "foo",
    fn: spy(() => "bar"),
  });
  const stepResult = await runner.run(step, stack);
  assertSpyCalls(step.fn as SpyLike, 1);
  expect(stepResult).toMatchObject({
    status: "passed",
    value: "bar",
    metadata: {
      kind: "resource",
      name: "foo",
    },
  });
  expect(scenarioCtx.resources).toEqual({
    foo: "bar",
  });
});

Deno.test("StepRunner run runs resource step (fail)", async () => {
  await using stack = new AsyncDisposableStack();
  const scenarioCtx = createTestScenarioContext(scenario);
  const runner = new StepRunner(
    reporter,
    scenario,
    scenarioCtx,
  );
  const step = createTestStep({
    kind: "resource",
    name: "foo",
    fn: spy(() => raise("bar")),
  });
  const stepResult = await runner.run(step, stack);
  assertSpyCalls(step.fn as SpyLike, 1);
  expect(stepResult).toMatchObject({
    status: "failed",
    error: "bar",
    metadata: {
      kind: "resource",
      name: "foo",
    },
  });
  expect(scenarioCtx.resources).toEqual({});
});

Deno.test("StepRunner run runs setup step", async () => {
  await using stack = new AsyncDisposableStack();
  const scenarioCtx = createTestScenarioContext(scenario);
  const runner = new StepRunner(
    reporter,
    scenario,
    scenarioCtx,
  );
  const step = createTestStep({
    kind: "setup",
    name: "foo",
    fn: spy(() => "bar"),
  });
  const stepResult = await runner.run(step, stack);
  assertSpyCalls(step.fn as SpyLike, 1);
  expect(stepResult).toMatchObject({
    status: "passed",
    value: undefined,
    metadata: {
      kind: "setup",
      name: "foo",
    },
  });
  expect(scenarioCtx.resources).toEqual({});
});

Deno.test("StepRunner run runs setup step (fail)", async () => {
  await using stack = new AsyncDisposableStack();
  const scenarioCtx = createTestScenarioContext(scenario);
  const runner = new StepRunner(
    reporter,
    scenario,
    scenarioCtx,
  );
  const step = createTestStep({
    kind: "setup",
    name: "foo",
    fn: spy(() => raise("bar")),
  });
  const stepResult = await runner.run(step, stack);
  assertSpyCalls(step.fn as SpyLike, 1);
  expect(stepResult).toMatchObject({
    status: "failed",
    error: "bar",
    metadata: {
      kind: "setup",
      name: "foo",
    },
  });
  expect(scenarioCtx.resources).toEqual({});
});

Deno.test("StepRunner run runs execution step", async () => {
  await using stack = new AsyncDisposableStack();
  const scenarioCtx = createTestScenarioContext(scenario);
  const runner = new StepRunner(
    reporter,
    scenario,
    scenarioCtx,
  );
  const step = createTestStep({
    kind: "step",
    name: "foo",
    fn: spy(() => "bar"),
  });
  const stepResult = await runner.run(step, stack);
  assertSpyCalls(step.fn as SpyLike, 1);
  expect(stepResult).toMatchObject({
    status: "passed",
    value: "bar",
    metadata: {
      kind: "step",
      name: "foo",
    },
  });
  expect(scenarioCtx.resources).toEqual({});
});

Deno.test("StepRunner run runs execution step (fail)", async () => {
  await using stack = new AsyncDisposableStack();
  const scenarioCtx = createTestScenarioContext(scenario);
  const runner = new StepRunner(
    reporter,
    scenario,
    scenarioCtx,
  );
  const step = createTestStep({
    kind: "step",
    name: "foo",
    fn: spy(() => raise("bar")),
  });
  const stepResult = await runner.run(step, stack);
  assertSpyCalls(step.fn as SpyLike, 1);
  expect(stepResult).toMatchObject({
    status: "failed",
    error: "bar",
    metadata: {
      kind: "step",
      name: "foo",
    },
  });
  expect(scenarioCtx.resources).toEqual({});
});

Deno.test({
  name: "StepRunner run handles step timeout",
  sanitizeResources: false, // Timeout tests inherently leak timers
  sanitizeOps: false,
  async fn() {
    await using stack = new AsyncDisposableStack();
    const scenarioCtx = createTestScenarioContext(scenario);
    const runner = new StepRunner(
      reporter,
      scenario,
      scenarioCtx,
    );
    const step = createTestStep({
      kind: "step",
      name: "slow-step",
      timeout: 100, // 100ms timeout
      fn: spy(async (ctx) => {
        // Sleep for 200ms to trigger timeout, but respect abort signal
        let timerId: number | undefined;
        try {
          await new Promise((resolve, reject) => {
            if (ctx.signal?.aborted) {
              reject(ctx.signal.reason);
              return;
            }
            timerId = setTimeout(resolve, 200);
            const onAbort = () => {
              if (timerId !== undefined) {
                clearTimeout(timerId);
                timerId = undefined;
              }
              reject(ctx.signal?.reason);
            };
            ctx.signal?.addEventListener("abort", onAbort, { once: true });
          });
          return "should-not-reach";
        } finally {
          if (timerId !== undefined) {
            clearTimeout(timerId);
          }
        }
      }),
    });
    const stepResult = await runner.run(step, stack);
    assertSpyCalls(step.fn as SpyLike, 1);
    expect(stepResult).toMatchObject({
      status: "failed",
      metadata: {
        kind: "step",
        name: "slow-step",
      },
    });
    // Verify the error is StepTimeoutError with proper message
    expect(stepResult.status).toBe("failed");
    if (stepResult.status === "failed") {
      expect(stepResult.error).toBeInstanceOf(StepTimeoutError);
      const timeoutError = stepResult.error as StepTimeoutError;
      expect(timeoutError.stepName).toBe("slow-step");
      expect(timeoutError.timeoutMs).toBe(100);
      expect(timeoutError.attemptNumber).toBe(1);
      expect(timeoutError.elapsedMs).toBeGreaterThanOrEqual(100);
      expect(timeoutError.elapsedMs).toBeLessThan(200);
      expect(timeoutError.message).toBe(
        `Step "slow-step" timed out after 100ms, total elapsed: ${timeoutError.elapsedMs}ms`,
      );
    }
  },
});

Deno.test({
  name: "StepRunner run handles timeout with retry configured",
  sanitizeResources: false, // Timeout tests inherently leak timers
  sanitizeOps: false,
  async fn() {
    // Note: When timeout occurs, AbortSignal is triggered and retry is canceled.
    // Retry only applies to non-timeout errors. This test verifies that
    // attemptNumber is still recorded correctly (as 1) even with retry configured.
    await using stack = new AsyncDisposableStack();
    const scenarioCtx = createTestScenarioContext(scenario);
    const runner = new StepRunner(
      reporter,
      scenario,
      scenarioCtx,
    );
    const step = createTestStep({
      kind: "step",
      name: "slow-step-with-retry",
      timeout: 50, // 50ms timeout
      retry: {
        maxAttempts: 3, // Would retry for normal errors, but not for timeout
        backoff: "linear",
      },
      fn: spy(async (ctx) => {
        // Sleep for 100ms to trigger timeout
        let timerId: number | undefined;
        try {
          await new Promise((resolve, reject) => {
            if (ctx.signal?.aborted) {
              reject(ctx.signal.reason);
              return;
            }
            timerId = setTimeout(resolve, 100);
            const onAbort = () => {
              if (timerId !== undefined) {
                clearTimeout(timerId);
                timerId = undefined;
              }
              reject(ctx.signal?.reason);
            };
            ctx.signal?.addEventListener("abort", onAbort, { once: true });
          });
          return "should-not-reach";
        } finally {
          if (timerId !== undefined) {
            clearTimeout(timerId);
          }
        }
      }),
    });
    const stepResult = await runner.run(step, stack);
    // Timeout cancels retry, so only 1 attempt
    assertSpyCalls(step.fn as SpyLike, 1);
    expect(stepResult).toMatchObject({
      status: "failed",
      metadata: {
        kind: "step",
        name: "slow-step-with-retry",
      },
    });
    // Verify the error is StepTimeoutError
    expect(stepResult.status).toBe("failed");
    if (stepResult.status === "failed") {
      expect(stepResult.error).toBeInstanceOf(StepTimeoutError);
      const timeoutError = stepResult.error as StepTimeoutError;
      expect(timeoutError.stepName).toBe("slow-step-with-retry");
      expect(timeoutError.timeoutMs).toBe(50);
      expect(timeoutError.attemptNumber).toBe(1);
      expect(timeoutError.elapsedMs).toBeGreaterThanOrEqual(50);
      expect(timeoutError.elapsedMs).toBeLessThan(150);
    }
  },
});
