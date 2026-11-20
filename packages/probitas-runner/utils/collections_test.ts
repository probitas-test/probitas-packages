import { assertEquals } from "@std/assert";
import { test } from "@probitas-test/internal-testing";
import { omit } from "./collections.ts";

test("omit", async (t) => {
  await t.step("returns a copy without the given keys", () => {
    const source = { a: 1, b: 2, c: 3 };
    assertEquals(omit(source, ["b"]), { a: 1, c: 3 });
    assertEquals(source, { a: 1, b: 2, c: 3 });
  });
});
