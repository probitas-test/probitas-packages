import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@probitas-test/internal-testing";
import { buildVersions } from "./apply_versions.ts";

test("buildVersions", async (t) => {
  const packages = [
    { name: "core", dir: "core", from: "0.3.2", to: "0.4.0", commits: [] },
    { name: "runner", dir: "runner", from: "0.5.6", commits: [] },
  ];

  await t.step("released packages take the planned version", () => {
    assertEquals(
      Object.fromEntries(buildVersions(packages)),
      { core: "0.4.0", runner: "0.5.6" },
    );
  });

  await t.step("a suffix marks only the released packages", () => {
    assertEquals(
      Object.fromEntries(buildVersions(packages, "next.7")),
      { core: "0.4.0-next.7", runner: "0.5.6" },
    );
  });

  await t.step("a package with no version to pin is an error", () => {
    assertThrows(
      () => buildVersions([{ name: "new", dir: "new", commits: [] }]),
      Error,
      "new",
    );
  });
});
