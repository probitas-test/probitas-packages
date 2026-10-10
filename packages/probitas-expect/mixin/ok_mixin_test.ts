import { assertEquals } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { colorTheme } from "@probitas-test/core/theme";
import { catchError } from "../utils.ts";
import { assertSnapshotWithoutColors } from "./_testutils.ts";
import { createOkMixin } from "./ok_mixin.ts";
import { assertSnapshot, test } from "@probitas-test/internal-testing";

const testFilePath = new URL(import.meta.url).pathname;

test("createOkMixin - type check", () => {
  const applier = createOkMixin(() => true, () => false, {
    valueName: "response",
  });
  const applied = applier({ dummy: true });
  type Expected = {
    dummy: boolean;
    toBeOk: (this: Expected) => Expected;
  };
  type Actual = typeof applied;
  assertType<IsExact<Actual, Expected>>(true);
});

test("createOkMixin - attribute check", () => {
  const applier = createOkMixin(() => true, () => false, {
    valueName: "response",
  });
  const applied = applier({ dummy: true });
  const expected = [
    "dummy",
    "toBeOk",
  ];
  assertEquals(Object.getOwnPropertyNames(applied).sort(), expected.sort());
});

test("createOkMixin - toBeOk", async (t) => {
  await t.step("success", () => {
    const applier = createOkMixin(() => true, () => false, {
      valueName: "response",
    });
    const applied = applier({ dummy: true });
    assertEquals(applied.toBeOk(), applied);
  });

  await t.step("fail", async () => {
    const applier = createOkMixin(() => false, () => false, {
      valueName: "response",
    });
    const applied = applier({ dummy: true });
    await assertSnapshotWithoutColors(
      t,
      catchError(() => applied.toBeOk()).message,
    );
  });

  await t.step("fail with source context (noColor)", async () => {
    const applier = createOkMixin(() => false, () => false, {
      valueName: "response",
      expectOrigin: { path: testFilePath, line: 57, column: 5 },
    });
    const applied = applier({ dummy: true });
    await assertSnapshotWithoutColors(
      t,
      catchError(() => applied.toBeOk()).message,
    );
  });

  await t.step("fail with source context (withColor)", async () => {
    const applier = createOkMixin(() => false, () => false, {
      valueName: "response",
      expectOrigin: { path: testFilePath, line: 69, column: 5 },
      theme: colorTheme,
    });
    const applied = applier({ dummy: true });
    await assertSnapshot(
      t,
      catchError(() => applied.toBeOk()).message,
    );
  });
});
