import { assertEquals } from "@std/assert";
import { xor } from "./xor.ts";
import { test } from "@probitas-test/internal-testing";

test("xor - truth table verification", () => {
  assertEquals(xor(false, false), false);
  assertEquals(xor(false, true), true);
  assertEquals(xor(true, false), true);
  assertEquals(xor(true, true), false);
});

test("xor - negation logic for mixin pattern", () => {
  // negate=false: pass if check passes
  assertEquals(xor(false, true), true);
  assertEquals(xor(false, false), false);

  // negate=true: pass if check fails (inverted)
  assertEquals(xor(true, false), true);
  assertEquals(xor(true, true), false);
});
