/**
 * Decide the next version of every package for a release.
 *
 * Releases are cut as GitHub Releases with a repository-wide calendar tag
 * (`v20261008.01`). Package versions are not kept in the repository; they are
 * derived here:
 *
 * - **Which packages**: those with commits touching `packages/<name>/` since
 *   the previous release tag, test-only changes excluded. Without a previous
 *   tag every package is released (the first release of the Bun build).
 * - **How far**: from the Conventional Commits that touched the package —
 *   breaking (`!`, `BREAKING CHANGE:`, `BREAKING(...)`) is major, `feat` is
 *   minor, any other type is patch, `/unstable` scopes are always patch. In
 *   0.x, major and minor both bump the minor version.
 * - **Dependents**: siblings pin each other to exact versions, so every
 *   package depending (transitively) on a released one is released with at
 *   least a patch.
 * - **From what**: the latest stable version on npm, falling back to JSR (the
 *   Deno-era releases) and finally to the manifest for a package never
 *   published, which is then released at its manifest version as is.
 *
 * Usage:
 *   bun scripts/release_plan.ts --tag <tag> [--previous <tag>] \
 *     --out versions.json [--notes notes.md]
 *
 * @module
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

export type Level = "major" | "minor" | "patch";

const LEVEL_RANK: Record<Level, number> = { patch: 0, minor: 1, major: 2 };

function maxLevel(
  a: Level | undefined,
  b: Level | undefined,
): Level | undefined {
  if (!a) return b;
  if (!b) return a;
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

/**
 * Release level a commit message calls for, or undefined for messages that
 * are not Conventional Commits (merge commits and the like)
 */
function classifyCommit(message: string): Level | undefined {
  const [subject = ""] = message.split("\n", 1);
  const match = subject.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s/);
  if (!match) return undefined;
  const [, type, scope = "", bang] = match;
  if (scope.split(",").some((s) => s.trim().endsWith("/unstable"))) {
    return "patch";
  }
  if (
    type === "BREAKING" || bang === "!" ||
    /^BREAKING[ -]CHANGE:/m.test(message)
  ) {
    return "major";
  }
  return type === "feat" ? "minor" : "patch";
}

function parseVersion(version: string): [number, number, number] {
  const [core] = version.split("-", 1);
  const [major = 0, minor = 0, patch = 0] = core.split(".").map(Number);
  return [major, minor, patch];
}

function bumpVersion(version: string, level: Level): string {
  const [major, minor, patch] = parseVersion(version);
  if (major === 0) {
    return level === "patch" ? `0.${minor}.${patch + 1}` : `0.${minor + 1}.0`;
  }
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Add a patch release for every package depending, directly or not, on a
 * package that is released
 */
function cascadeLevels(
  levels: ReadonlyMap<string, Level>,
  dependencies: ReadonlyMap<string, readonly string[]>,
): Map<string, Level> {
  const result = new Map(levels);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, deps] of dependencies) {
      if (result.has(name)) continue;
      if (deps.some((dep) => result.has(dep))) {
        result.set(name, "patch");
        changed = true;
      }
    }
  }
  return result;
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function latestStable(versions: readonly string[]): string | undefined {
  return versions
    .filter((v) => !v.includes("-"))
    .sort(compareVersions)
    .at(-1);
}

function chooseBase(
  options: { npm?: string; jsr?: string; manifest: string },
): string {
  return options.npm ?? options.jsr ?? options.manifest;
}

export interface PlannedPackage {
  /** npm name (`@probitas-test/<name>`) */
  name: string;
  /** Directory under `packages/` */
  dir: string;
  /** Latest released version, or undefined for a package never published */
  from?: string;
  /** Version to release, or undefined when the package is not released */
  to?: string;
  level?: Level;
  /** Subjects of the commits behind the release */
  commits: string[];
}

export interface ReleasePlan {
  tag: string;
  previous?: string;
  packages: PlannedPackage[];
}

interface Manifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}

/** Paths whose changes do not reach the published package. */
const TEST_ONLY = [
  "**/*_test.ts",
  "**/_testutils.ts",
  "**/testkit.ts",
  "**/__snapshots__/**",
];

const ROOT = join(import.meta.dir, "..");

function git(args: string[]): string {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

function commitsTouching(range: string, dir: string): string[] {
  const out = git([
    "log",
    "--format=%B%x1e",
    range,
    "--",
    `packages/${dir}`,
    ...TEST_ONLY.map((p) => `:(exclude,glob)packages/${dir}/${p}`),
  ]);
  return out.split("\x1e").map((m) => m.trim()).filter((m) => m !== "");
}

async function registryVersions(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const json = await response.json() as { versions?: Record<string, unknown> };
  return Object.keys(json.versions ?? {});
}

async function buildPlan(
  root: string,
  tag: string,
  previous: string | undefined,
): Promise<ReleasePlan> {
  const packagesDir = join(root, "packages");
  const manifests = readdirSync(packagesDir).map((dir) => ({
    dir,
    manifest: JSON.parse(
      readFileSync(join(packagesDir, dir, "package.json"), "utf8"),
    ) as Manifest,
  }));
  const names = new Set(manifests.map((m) => m.manifest.name));
  const dependencies = new Map(
    manifests.map(({ manifest }) => [
      manifest.name,
      Object.keys(manifest.dependencies ?? {}).filter((d) => names.has(d)),
    ]),
  );

  const direct = new Map<string, Level>();
  const commits = new Map<string, string[]>();
  for (const { dir, manifest } of manifests) {
    if (!previous) {
      direct.set(manifest.name, "major");
      commits.set(manifest.name, []);
      continue;
    }
    const messages = commitsTouching(`${previous}..${tag}`, dir);
    let level: Level | undefined;
    for (const message of messages) {
      level = maxLevel(level, classifyCommit(message));
    }
    if (level) direct.set(manifest.name, level);
    commits.set(manifest.name, messages.map((m) => m.split("\n", 1)[0]));
  }
  const levels = cascadeLevels(direct, dependencies);

  const packages: PlannedPackage[] = [];
  for (const { dir, manifest } of manifests) {
    const short = manifest.name.replace(/^@probitas-test\//, "");
    const [npm, jsr] = await Promise.all([
      registryVersions(`https://registry.npmjs.org/${manifest.name}`),
      registryVersions(`https://jsr.io/@probitas/${short}/meta.json`),
    ]);
    const published = latestStable(npm) ?? latestStable(jsr);
    const level = levels.get(manifest.name);
    const to = level === undefined
      ? undefined
      : published === undefined
      ? manifest.version
      : bumpVersion(
        chooseBase({
          npm: latestStable(npm),
          jsr: latestStable(jsr),
          manifest: manifest.version,
        }),
        level,
      );
    packages.push({
      name: manifest.name,
      dir,
      from: published,
      to,
      level,
      commits: commits.get(manifest.name) ?? [],
    });
  }
  return { tag, previous, packages };
}

/** Markdown for the GitHub Release body. */
export function formatNotes(plan: ReleasePlan): string {
  const released = plan.packages.filter((p) => p.to);
  if (released.length === 0) {
    return "No package changes since the previous release.\n";
  }
  const lines = [
    plan.previous
      ? `Changes since ${plan.previous}.`
      : "First release of the Bun build.",
    "",
    "| Package | Version | |",
    "| --- | --- | --- |",
    ...released.map((p) =>
      `| \`${p.name}\` | ${p.from ?? "—"} → **${p.to}** | ${
        p.commits.length > 0 ? p.level : "dependency update"
      } |`
    ),
  ];
  for (const p of released.filter((p) => p.commits.length > 0)) {
    lines.push(
      "",
      `### ${p.name} ${p.to}`,
      "",
      ...p.commits.map((c) => `- ${c}`),
    );
  }
  return lines.join("\n") + "\n";
}

async function main(): Promise<void> {
  const { values: args } = parseArgs({
    args: process.argv.slice(2),
    options: {
      tag: { type: "string" },
      previous: { type: "string" },
      out: { type: "string" },
      notes: { type: "string" },
    },
  });
  if (!args.tag || !args.out) {
    console.error(
      "usage: bun scripts/release_plan.ts --tag <tag> [--previous <tag>] --out <file> [--notes <file>]",
    );
    process.exit(1);
  }
  const plan = await buildPlan(ROOT, args.tag, args.previous || undefined);
  writeFileSync(args.out, JSON.stringify(plan, null, 2) + "\n");
  if (args.notes) writeFileSync(args.notes, formatNotes(plan));
  for (const p of plan.packages.filter((p) => p.to)) {
    console.log(`${p.name}: ${p.from ?? "(new)"} -> ${p.to} (${p.level})`);
  }
}

if (import.meta.main) await main();

/** @internal */
export const _internal = {
  classifyCommit,
  bumpVersion,
  cascadeLevels,
  latestStable,
  chooseBase,
};
