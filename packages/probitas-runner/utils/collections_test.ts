import { assertEquals } from "@std/assert";
import { test } from "@probitas-test/internal-testing";
import { chunk, omit } from "./collections.ts";

test("chunk", async (t) => {
  await t.step("splits into chunks of the given size", () => {
    assertEquals(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  await t.step("returns no chunks for an empty array", () => {
    assertEquals(chunk([], 3), []);
  });
});

test("omit", async (t) => {
  await t.step("returns a copy without the given keys", () => {
    const source = { a: 1, b: 2, c: 3 };
    assertEquals(omit(source, ["b"]), { a: 1, c: 3 });
    assertEquals(source, { a: 1, b: 2, c: 3 });
  });
});
