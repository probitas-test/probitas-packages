import { assertEquals } from "@std/assert";
import { test } from "@probitas-test/internal-testing";
import { _internal } from "./release_plan.ts";

const { classifyCommit, bumpVersion, cascadeLevels, latestStable, chooseBase } =
  _internal;

test("classifyCommit", async (t) => {
  await t.step("feat is minor, other conventional types are patch", () => {
    assertEquals(classifyCommit("feat(runner): add retry"), "minor");
    assertEquals(
      classifyCommit("fix(runner): handle timeout"),
      "patch",
    );
    assertEquals(classifyCommit("docs(*): fix typo"), "patch");
    assertEquals(classifyCommit("chore(*): bump deps"), "patch");
  });

  await t.step("breaking markers are major", () => {
    assertEquals(
      classifyCommit("feat(runner)!: change API"),
      "major",
    );
    assertEquals(classifyCommit("fix!: drop option"), "major");
    assertEquals(
      classifyCommit(
        "refactor(core): rename\n\nBREAKING CHANGE: renamed X",
      ),
      "major",
    );
    assertEquals(classifyCommit("BREAKING(core): rename"), "major");
  });

  await t.step("unstable scopes never go beyond patch", () => {
    assertEquals(
      classifyCommit("feat(runner/unstable)!: experimental"),
      "patch",
    );
  });

  await t.step("a scope naming other packages is only a patch", () => {
    const message = "feat(client-deno-kv,expect)!: remove";
    assertEquals(classifyCommit(message, "expect"), "major");
    assertEquals(classifyCommit(message, "client-redis"), "patch");
    assertEquals(classifyCommit("feat(runner): add retry", "runner"), "minor");
    assertEquals(
      classifyCommit("feat(runner/unstable)!: try", "runner"),
      "patch",
    );
  });

  await t.step("scopes may carry a registry prefix", () => {
    // Scopes used to be the JSR package names; history still has them
    assertEquals(
      classifyCommit("feat(@probitas/runner): add", "runner"),
      "minor",
    );
    assertEquals(
      classifyCommit("feat(@probitas-test/runner): add", "runner"),
      "minor",
    );
    assertEquals(
      classifyCommit("feat(@probitas/runner): add", "core"),
      "patch",
    );
  });

  await t.step(
    "repository-wide or missing scopes apply to every package",
    () => {
      assertEquals(classifyCommit("feat(*)!: drop Deno", "core"), "major");
      assertEquals(classifyCommit("feat: add", "core"), "minor");
    },
  );

  await t.step("non-conventional commits are ignored", () => {
    assertEquals(classifyCommit("Merge pull request #26 from x/y"), undefined);
    assertEquals(classifyCommit("WIP"), undefined);
  });
});

test("bumpVersion", async (t) => {
  await t.step("0.x treats breaking changes and features as minor", () => {
    assertEquals(bumpVersion("0.5.2", "major"), "0.6.0");
    assertEquals(bumpVersion("0.5.2", "minor"), "0.6.0");
    assertEquals(bumpVersion("0.5.2", "patch"), "0.5.3");
  });

  await t.step("1.x and later follow semver", () => {
    assertEquals(bumpVersion("1.2.3", "major"), "2.0.0");
    assertEquals(bumpVersion("1.2.3", "minor"), "1.3.0");
    assertEquals(bumpVersion("1.2.3", "patch"), "1.2.4");
  });

  await t.step("ignores a prerelease suffix on the base", () => {
    assertEquals(bumpVersion("0.5.2-next.1", "patch"), "0.5.3");
  });
});

test("cascadeLevels gives dependents of bumped packages a patch", () => {
  const dependencies = new Map([
    ["core", []],
    ["runner", ["core"]],
    ["reporter", ["runner"]],
    ["client", []],
  ]);
  const levels = cascadeLevels(
    new Map([["core", "minor" as const]]),
    dependencies,
  );
  assertEquals(
    Object.fromEntries(levels),
    { core: "minor", runner: "patch", reporter: "patch" },
  );
});

test("cascadeLevels keeps a higher level already planned", () => {
  const dependencies = new Map([["core", []], ["runner", ["core"]]]);
  const levels = cascadeLevels(
    new Map([["core", "patch" as const], ["runner", "minor" as const]]),
    dependencies,
  );
  assertEquals(levels.get("runner"), "minor");
});

test("latestStable picks the highest non-prerelease version", () => {
  assertEquals(
    latestStable(["0.5.2-next.0", "0.4.9", "0.10.0", "0.10.1-next.3", "0.9.0"]),
    "0.10.0",
  );
  assertEquals(latestStable(["0.5.2-next.0", "0.0.0-stage"]), undefined);
});

test("chooseBase prefers npm, then JSR, then the manifest", () => {
  assertEquals(
    chooseBase({ npm: "0.6.0", jsr: "0.5.2", manifest: "0.5.2" }),
    "0.6.0",
  );
  assertEquals(chooseBase({ jsr: "0.5.2", manifest: "0.1.0" }), "0.5.2");
  assertEquals(chooseBase({ manifest: "0.1.0" }), "0.1.0");
});
