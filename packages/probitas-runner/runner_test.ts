import { expect } from "@std/expect";
import { delay } from "@std/async/delay";
import { raise } from "@core/errorutil/raise";
import {
  createTestScenario,
  createTestStep,
  TestReporter,
} from "./_testutils.ts";
import { Skip } from "./skip.ts";
import { Runner } from "./runner.ts";
import { createScopedSignal } from "./utils/signal.ts";
import { ScenarioTimeoutError } from "./errors.ts";

const reporter = new TestReporter();

Deno.test("Runner run runs single scenario", async () => {
  const runner = new Runner(reporter);
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => "1",
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios);
  expect(summary).toMatchObject({
    total: 1,
    passed: 1,
    skipped: 0,
    failed: 0,
  });
});

Deno.test("Runner run runs single scenario (skip)", async () => {
  const runner = new Runner(reporter);
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => raise(new Skip("1")),
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios);
  expect(summary).toMatchObject({
    total: 1,
    passed: 0,
    skipped: 1,
    failed: 0,
  });
});

Deno.test("Runner run runs multiple scenarios", async () => {
  const runner = new Runner(reporter);
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => "1",
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 2",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => "1",
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 3",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => "1",
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios);
  expect(summary).toMatchObject({
    total: 3,
    passed: 3,
    skipped: 0,
    failed: 0,
  });
});

Deno.test("Runner run runs multiple scenarios (skip)", async () => {
  const runner = new Runner(reporter);
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => "1",
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 2",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => raise(new Skip("1")),
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 3",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => "1",
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios);
  expect(summary).toMatchObject({
    total: 3,
    passed: 2,
    skipped: 1,
    failed: 0,
  });
});

Deno.test("Runner run runs multiple scenarios (failed)", async () => {
  using signal = createScopedSignal();
  const runner = new Runner(reporter);
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async () => {
            await delay(0, { signal });
            return "1";
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 2",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async () => {
            await delay(50, { signal });
            throw "2";
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 3",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async () => {
            await delay(100, { signal });
            return "3";
          },
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios, {
    signal,
    maxFailures: 1,
  });
  expect(summary).toMatchObject({
    total: 3,
    passed: 1,
    skipped: 1,
    failed: 1,
  });
});

Deno.test({
  name: "Runner run handles scenario timeout",
  sanitizeResources: false, // Timeout tests inherently leak timers
  sanitizeOps: false,
  async fn() {
    const runner = new Runner(reporter);
    const scenarios = [
      createTestScenario({
        name: "Slow Scenario",
        steps: [
          createTestStep({
            name: "Slow Step",
            fn: async (ctx) => {
              // Sleep for 200ms to trigger scenario timeout
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
                  ctx.signal?.addEventListener("abort", onAbort, {
                    once: true,
                  });
                });
                return "should-not-reach";
              } finally {
                if (timerId !== undefined) {
                  clearTimeout(timerId);
                }
              }
            },
          }),
        ],
      }),
    ];

    const summary = await runner.run(scenarios, {
      timeout: 100, // 100ms scenario timeout
    });

    expect(summary).toMatchObject({
      total: 1,
      passed: 0,
      skipped: 0,
      failed: 1,
    });

    // Verify the error is ScenarioTimeoutError
    const scenarioResult = summary.scenarios[0];
    expect(scenarioResult.status).toBe("failed");
    if (scenarioResult.status === "failed") {
      expect(scenarioResult.error).toBeInstanceOf(ScenarioTimeoutError);
      const timeoutError = scenarioResult.error as ScenarioTimeoutError;
      expect(timeoutError.scenarioName).toBe("Slow Scenario");
      expect(timeoutError.timeoutMs).toBe(100);
      expect(timeoutError.elapsedMs).toBeGreaterThanOrEqual(100);
      expect(timeoutError.elapsedMs).toBeLessThan(200);
      expect(timeoutError.message).toContain(
        'Scenario "Slow Scenario" timed out after 100ms',
      );
    }
  },
});

Deno.test({
  name: "Runner run handles timeout for multiple scenarios independently",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const runner = new Runner(reporter);
    const scenarios = [
      createTestScenario({
        name: "Fast Scenario",
        steps: [
          createTestStep({
            name: "Fast Step",
            fn: async (ctx) => {
              await delay(30, { signal: ctx.signal });
              return "fast-result";
            },
          }),
        ],
      }),
      createTestScenario({
        name: "Slow Scenario",
        steps: [
          createTestStep({
            name: "Slow Step",
            fn: async (ctx) => {
              // Sleep for 200ms to trigger scenario timeout
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
                  ctx.signal?.addEventListener("abort", onAbort, {
                    once: true,
                  });
                });
                return "should-not-reach";
              } finally {
                if (timerId !== undefined) {
                  clearTimeout(timerId);
                }
              }
            },
          }),
        ],
      }),
    ];

    const summary = await runner.run(scenarios, {
      timeout: 100, // 100ms per scenario
      maxConcurrency: 1, // Sequential to verify independent timeout
    });

    expect(summary).toMatchObject({
      total: 2,
      passed: 1,
      skipped: 0,
      failed: 1,
    });

    // Verify fast scenario passed
    const fastResult = summary.scenarios.find((s) =>
      s.metadata.name === "Fast Scenario"
    );
    expect(fastResult?.status).toBe("passed");

    // Verify slow scenario timed out
    const slowResult = summary.scenarios.find((s) =>
      s.metadata.name === "Slow Scenario"
    );
    expect(slowResult?.status).toBe("failed");
    if (slowResult?.status === "failed") {
      expect(slowResult.error).toBeInstanceOf(ScenarioTimeoutError);
    }
  },
});

Deno.test({
  name: "Runner run without timeout runs normally",
  async fn() {
    const runner = new Runner(reporter);
    const scenarios = [
      createTestScenario({
        name: "Normal Scenario",
        steps: [
          createTestStep({
            name: "Normal Step",
            fn: async (ctx) => {
              await delay(50, { signal: ctx.signal });
              return "result";
            },
          }),
        ],
      }),
    ];

    // No timeout specified - should complete normally
    const summary = await runner.run(scenarios);

    expect(summary).toMatchObject({
      total: 1,
      passed: 1,
      skipped: 0,
      failed: 0,
    });
  },
});
