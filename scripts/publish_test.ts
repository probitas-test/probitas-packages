import { assertEquals } from "@std/assert";
import { test } from "@probitas-test/internal-testing";
import { _internal } from "./publish.ts";

const { alreadyPublished } = _internal;

test("alreadyPublished", async (t) => {
  await t.step("recognises npm refusing an existing version", () => {
    assertEquals(
      alreadyPublished(
        'npm error 409 Conflict - PUT https://registry.npmjs.org/@probitas-test%2fclient-sql-mysql - Cannot publish over previously staged version "0.5.1".',
      ),
      true,
    );
    assertEquals(
      alreadyPublished(
        "npm error 403 You cannot publish over the previously published versions: 0.5.1.",
      ),
      true,
    );
  });

  await t.step("leaves other failures alone", () => {
    assertEquals(alreadyPublished("npm error 404 Not Found - PUT ..."), false);
    assertEquals(alreadyPublished("npm error 403 Forbidden"), false);
  });
});
