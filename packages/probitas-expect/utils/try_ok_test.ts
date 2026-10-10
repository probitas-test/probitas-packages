import { assertEquals } from "@std/assert";
import { tryOk } from "./try_ok.ts";
import { test } from "@probitas-test/internal-testing";

test("tryOk - returns true when function succeeds", () => {
  const result = tryOk(() => {});
  assertEquals(result, true);
});

test("tryOk - returns false when function throws", () => {
  const result = tryOk(() => {
    throw new Error("test error");
  });
  assertEquals(result, false);
});

test("tryOk - works with @std/expect assertions", async () => {
  const { expect } = await import("@std/expect");

  assertEquals(tryOk(() => expect(42).toBe(42)), true);
  assertEquals(tryOk(() => expect(42).toBe(100)), false);
});
