/**
 * Publish the packages of a release plan to npm and JSR.
 *
 * Run after `apply_versions.ts`, `build.ts`, `pack.ts` and `sync_jsr.ts`.
 * Versions already on a registry are skipped, so a failed run can be re-run.
 *
 * - npm: every released package's tarball from `dist-pack/`, under
 *   `--dist-tag`. Authenticates through npm trusted publishing.
 * - JSR: only for `--dist-tag latest` (npm prereleases are never published
 *   to JSR). `jsr publish` at the workspace root publishes the members in
 *   dependency order and skips versions already published, which covers the
 *   packages this release leaves unchanged. Authenticates through GitHub OIDC.
 *
 * Usage: bun scripts/publish.ts --plan versions.json --dist-tag <tag> [--dry-run]
 *
 * @module
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import type { ReleasePlan } from "./release_plan.ts";

const root = join(import.meta.dir, "..");

function run(command: string, args: string[], cwd = root): void {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status}`);
  }
}

/**
 * Run a command, retrying failures; only for commands that are safe to
 * repeat (`jsr publish` skips the versions it already published).
 */
function runWithRetry(command: string, args: string[], attempts = 3): void {
  for (let attempt = 1;; attempt++) {
    try {
      run(command, args);
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.log(`retrying in 30s (attempt ${attempt} of ${attempts} failed)`);
      Bun.sleepSync(30_000);
    }
  }
}

function onNpm(spec: string): boolean {
  return spawnSync("npm", ["view", spec, "version"], { stdio: "ignore" })
    .status === 0;
}

/**
 * Whether npm refused a publish because the version already exists. `npm
 * view` can miss a version published moments ago (registry caching), so a
 * re-run may still try to publish it.
 */
function alreadyPublished(stderr: string): boolean {
  return /Cannot publish over previously|cannot publish over the previously published/i
    .test(stderr);
}

function npmPublish(args: string[]): void {
  console.log(`$ npm ${args.join(" ")}`);
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: ["inherit", "inherit", "pipe"],
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  process.stderr.write(result.stderr);
  if (result.status === 0) return;
  if (alreadyPublished(result.stderr)) {
    console.log("skip (already on npm)");
    return;
  }
  throw new Error(`npm exited with ${result.status}`);
}

/** `bun pm pack` names tarballs `<scope>-<name>-<version>.tgz`. */
function tarballName(name: string, version: string): string {
  return `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`;
}

function main(): void {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      plan: { type: "string" },
      "dist-tag": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const distTag = values["dist-tag"];
  if (!values.plan || !distTag) {
    console.error(
      "usage: bun scripts/publish.ts --plan <file> --dist-tag <tag> [--dry-run]",
    );
    process.exit(1);
  }
  const dryRun = values["dry-run"] ? ["--dry-run"] : [];
  const plan: ReleasePlan = JSON.parse(readFileSync(values.plan, "utf8"));

  for (const p of plan.packages.filter((p) => p.to)) {
    // apply_versions.ts may have added a prerelease suffix.
    const version = JSON.parse(
      readFileSync(join(root, "packages", p.dir, "package.json"), "utf8"),
    ).version as string;
    const spec = `${p.name}@${version}`;
    if (onNpm(spec)) {
      console.log(`skip ${spec} (already on npm)`);
      continue;
    }
    npmPublish([
      "publish",
      `./dist-pack/${tarballName(p.name, version)}`,
      "--tag",
      distTag,
      "--access",
      "public",
      ...dryRun,
    ]);
  }

  if (distTag === "latest") {
    runWithRetry("npx", [
      "--yes",
      "jsr",
      "publish",
      "--allow-dirty",
      ...dryRun,
    ]);
  }
}

/** @internal */
export const _internal = { alreadyPublished };

if (import.meta.main) main();
