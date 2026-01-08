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

Deno.test("Runner run runs multiple scenarios (failed) - aborts on maxFailures", async () => {
  using signal = createScopedSignal();
  const runner = new Runner(reporter);
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async (ctx) => {
            await delay(0, { signal: ctx.signal });
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
          fn: async (ctx) => {
            await delay(50, { signal: ctx.signal });
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
          fn: async (ctx) => {
            await delay(100, { signal: ctx.signal });
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

  // When maxFailures is reached, all scenarios (running or pending) should be aborted
  // Scenario 1 passes (fastest, 0ms delay)
  // Scenario 2 fails (50ms delay, triggers maxFailures)
  // Scenario 3 should be aborted/skipped (100ms delay, still running when maxFailures reached)
  expect(summary).toMatchObject({
    total: 3,
    passed: 1,
    skipped: 1, // Scenario 3 aborted
    failed: 1, // Scenario 2
  });
});

Deno.test("Runner run with maxFailures skips remaining scenarios (sequential)", async () => {
  const runner = new Runner(reporter);
  const executionOrder: string[] = [];
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => {
            executionOrder.push("Scenario 1");
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
          fn: () => {
            executionOrder.push("Scenario 2");
            throw new Error("Scenario 2 failed");
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 3",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => {
            executionOrder.push("Scenario 3");
            return "3";
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 4",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => {
            executionOrder.push("Scenario 4");
            return "4";
          },
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios, {
    maxConcurrency: 1, // Sequential execution
    maxFailures: 1,
  });

  // Scenario 1 should pass, Scenario 2 should fail, Scenario 3 and 4 should be skipped
  expect(summary).toMatchObject({
    total: 4,
    passed: 1,
    failed: 1,
    skipped: 2,
  });

  // Only Scenario 1 and 2 should have been executed
  expect(executionOrder).toEqual(["Scenario 1", "Scenario 2"]);

  // Check scenario results
  const results = summary.scenarios;
  expect(results.length).toBe(4);
  expect(results[0].status).toBe("passed");
  expect(results[0].metadata.name).toBe("Scenario 1");
  expect(results[1].status).toBe("failed");
  expect(results[1].metadata.name).toBe("Scenario 2");
  expect(results[2].status).toBe("skipped");
  expect(results[2].metadata.name).toBe("Scenario 3");
  expect(results[3].status).toBe("skipped");
  expect(results[3].metadata.name).toBe("Scenario 4");
});

Deno.test("Runner run with maxFailures aborts in-progress scenarios (parallel)", async () => {
  using signal = createScopedSignal();
  const runner = new Runner(reporter);
  const executionOrder: string[] = [];
  const scenarios = [
    createTestScenario({
      name: "Scenario 1",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async (ctx) => {
            executionOrder.push("Scenario 1 start");
            try {
              await delay(100, { signal: ctx.signal }); // Slow - will be aborted
              executionOrder.push("Scenario 1 end");
              return "1";
            } catch (err) {
              executionOrder.push("Scenario 1 aborted");
              throw err;
            }
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 2",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async (ctx) => {
            executionOrder.push("Scenario 2 start");
            await delay(10, { signal: ctx.signal }); // Fast
            executionOrder.push("Scenario 2 end");
            throw new Error("Scenario 2 failed");
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 3",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: async (ctx) => {
            executionOrder.push("Scenario 3 start");
            try {
              await delay(100, { signal: ctx.signal }); // Slow - will be aborted
              executionOrder.push("Scenario 3 end");
              return "3";
            } catch (err) {
              executionOrder.push("Scenario 3 aborted");
              throw err;
            }
          },
        }),
      ],
    }),
    createTestScenario({
      name: "Scenario 4",
      steps: [
        createTestStep({
          name: "Step 1",
          fn: () => {
            executionOrder.push("Scenario 4 start");
            return "4";
          },
        }),
      ],
    }),
  ];

  const summary = await runner.run(scenarios, {
    signal,
    maxConcurrency: 3, // Scenarios 1-3 run in parallel, 4 is in next batch
    maxFailures: 1,
  });

  // Scenario 1, 2, 3 all start in parallel
  // Scenario 2 finishes first and fails, triggers maxFailures
  // Scenarios 1, 3 are aborted immediately (signal.abort called)
  // Scenario 4 is in the next batch, never starts
  expect(summary).toMatchObject({
    total: 4,
    passed: 0,
    failed: 1, // Scenario 2
    skipped: 3, // Scenarios 1, 3, 4 all skipped
  });

  // Verify execution order
  expect(executionOrder).toContain("Scenario 1 start");
  expect(executionOrder).toContain("Scenario 1 aborted"); // Aborted, not completed
  expect(executionOrder).not.toContain("Scenario 1 end");

  expect(executionOrder).toContain("Scenario 2 start");
  expect(executionOrder).toContain("Scenario 2 end");

  expect(executionOrder).toContain("Scenario 3 start");
  expect(executionOrder).toContain("Scenario 3 aborted"); // Aborted, not completed
  expect(executionOrder).not.toContain("Scenario 3 end");

  // Scenario 4 should never start
  expect(executionOrder).not.toContain("Scenario 4 start");

  // Check scenario results
  const results = summary.scenarios;
  expect(results.length).toBe(4);

  // Find scenarios by name since order may vary in parallel execution
  const scenario1 = results.find((r) => r.metadata.name === "Scenario 1")!;
  const scenario2 = results.find((r) => r.metadata.name === "Scenario 2")!;
  const scenario3 = results.find((r) => r.metadata.name === "Scenario 3")!;
  const scenario4 = results.find((r) => r.metadata.name === "Scenario 4")!;

  expect(scenario1.status).toBe("skipped");
  expect(scenario2.status).toBe("failed");
  expect(scenario3.status).toBe("skipped");
  expect(scenario4.status).toBe("skipped");
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

Deno.test({
  name:
    "Runner run handles scenario timeout between steps (throwIfAborted case)",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const runner = new Runner(reporter);
    const scenarios = [
      createTestScenario({
        name: "Multi-step timeout scenario",
        steps: [
          createTestStep({
            name: "First step - 60ms",
            fn: async (ctx) => {
              await delay(60, { signal: ctx.signal });
              return { step: 1 };
            },
          }),
          createTestStep({
            name: "Second step - 60ms",
            fn: async (ctx) => {
              await delay(60, { signal: ctx.signal });
              return { step: 2 };
            },
          }),
        ],
      }),
    ];

    const summary = await runner.run(scenarios, {
      timeout: 80, // Timeout between first and second step
    });

    expect(summary).toMatchObject({
      total: 1,
      passed: 0,
      skipped: 0,
      failed: 1,
    });

    // Verify the error is ScenarioTimeoutError, not AbortError
    const scenarioResult = summary.scenarios[0];
    expect(scenarioResult.status).toBe("failed");
    if (scenarioResult.status === "failed") {
      expect(scenarioResult.error).toBeInstanceOf(ScenarioTimeoutError);
      const timeoutError = scenarioResult.error as ScenarioTimeoutError;
      expect(timeoutError.scenarioName).toBe("Multi-step timeout scenario");
      expect(timeoutError.timeoutMs).toBe(80);
    }
  },
});

Deno.test({
  name: "Runner run with timeout includes step info in ScenarioTimeoutError",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const runner = new Runner(reporter);
    const scenarios = [
      createTestScenario({
        name: "Timeout with step info",
        steps: [
          createTestStep({
            name: "fast-step",
            fn: async (ctx) => {
              await delay(10, { signal: ctx.signal });
              return "done";
            },
          }),
          createTestStep({
            name: "slow-step",
            fn: async (ctx) => {
              await delay(200, { signal: ctx.signal });
              return "should-timeout";
            },
          }),
          createTestStep({
            name: "never-reached",
            fn: () => "not-reached",
          }),
        ],
      }),
    ];

    const summary = await runner.run(scenarios, {
      timeout: 50,
    });

    expect(summary).toMatchObject({
      total: 1,
      passed: 0,
      skipped: 0,
      failed: 1,
    });

    const scenarioResult = summary.scenarios[0];
    expect(scenarioResult.status).toBe("failed");
    if (scenarioResult.status === "failed") {
      expect(scenarioResult.error).toBeInstanceOf(ScenarioTimeoutError);
      const timeoutError = scenarioResult.error as ScenarioTimeoutError;
      expect(timeoutError.scenarioName).toBe("Timeout with step info");
      expect(timeoutError.timeoutMs).toBe(50);
      expect(timeoutError.currentStepName).toBe("slow-step");
      expect(timeoutError.currentStepIndex).toBe(1);
      expect(timeoutError.message).toContain(
        'while executing step "slow-step"',
      );
      expect(timeoutError.message).toContain("(step 2)");
    }
  },
});

Deno.test({
  name: "Runner run with timeout on first step includes step index 0",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const runner = new Runner(reporter);
    const scenarios = [
      createTestScenario({
        name: "First step timeout",
        steps: [
          createTestStep({
            name: "first-slow-step",
            fn: async (ctx) => {
              await delay(200, { signal: ctx.signal });
              return "should-timeout";
            },
          }),
          createTestStep({
            name: "never-reached",
            fn: () => "not-reached",
          }),
        ],
      }),
    ];

    const summary = await runner.run(scenarios, {
      timeout: 50,
    });

    const scenarioResult = summary.scenarios[0];
    expect(scenarioResult.status).toBe("failed");
    if (scenarioResult.status === "failed") {
      expect(scenarioResult.error).toBeInstanceOf(ScenarioTimeoutError);
      const timeoutError = scenarioResult.error as ScenarioTimeoutError;
      expect(timeoutError.currentStepName).toBe("first-slow-step");
      expect(timeoutError.currentStepIndex).toBe(0);
      expect(timeoutError.message).toContain("(step 1)");
    }
  },
});
