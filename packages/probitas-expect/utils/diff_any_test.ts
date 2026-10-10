/**
 * Tests for diff_any module
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { Any } from "./diff_any.ts";
import { test } from "@probitas-test/internal-testing";
import { inspect } from "node:util";

test("Any displays as [Any] when inspected", () => {
  const result = inspect(Any);
  assertEquals(result, "[Any]");
});

test("Any displays as [Any] inside object", () => {
  const obj = { foo: Any };
  const result = inspect(obj);
  assertEquals(result, "{ foo: [Any] }");
});

test("Any displays as [Any] inside array", () => {
  const arr = [1, Any, 3];
  const result = inspect(arr);
  assertEquals(result, "[ 1, [Any], 3 ]");
});

test("Any is a singleton", () => {
  // Any should always be the same instance
  assertEquals(Any, Any);
});
