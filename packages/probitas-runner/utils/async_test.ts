import { assertEquals, assertRejects, assertStrictEquals } from "@std/assert";
import { test } from "@probitas-test/internal-testing";
import { abortable, delay } from "./async.ts";

test("abortable", async (t) => {
  await t.step("resolves with the promise when not aborted", async () => {
    const controller = new AbortController();
    assertEquals(await abortable(Promise.resolve(1), controller.signal), 1);
  });

  await t.step("rejects with the promise's error", async () => {
    const controller = new AbortController();
    await assertRejects(
      () => abortable(Promise.reject(new Error("boom")), controller.signal),
      Error,
      "boom",
    );
  });

  await t.step(
    "rejects with the signal's reason when it aborts first",
    async () => {
      const controller = new AbortController();
      const reason = new Error("stop");
      const pending = abortable(new Promise(() => {}), controller.signal);
      controller.abort(reason);
      const error = await pending.catch((e) => e);
      assertStrictEquals(error, reason);
    },
  );

  await t.step("rejects immediately when already aborted", async () => {
    const reason = new Error("already");
    const error = await abortable(
      Promise.resolve(1),
      AbortSignal.abort(reason),
    ).catch((e) => e);
    assertStrictEquals(error, reason);
  });
});

test("delay", async (t) => {
  await t.step("resolves after the given time", async () => {
    const start = performance.now();
    await delay(20);
    assertEquals(performance.now() - start >= 15, true);
  });

  await t.step("rejects with the signal's reason when aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    const pending = delay(10_000, { signal: controller.signal });
    controller.abort(reason);
    const error = await pending.catch((e) => e);
    assertStrictEquals(error, reason);
  });

  await t.step("rejects immediately when already aborted", async () => {
    const reason = new Error("already");
    const error = await delay(10_000, { signal: AbortSignal.abort(reason) })
      .catch((e) => e);
    assertStrictEquals(error, reason);
  });
});
