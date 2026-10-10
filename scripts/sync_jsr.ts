/**
 * Generate each package's `deno.json`, which is only the JSR publishing
 * manifest, from its `package.json`.
 *
 * Sources import siblings by their npm names (`@probitas-test/<name>`), while
 * on JSR the packages are `@probitas/<name>`. The generated import map points
 * sibling specifiers at JSR and every other dependency at npm, so JSR
 * consumers resolve the same code the npm packages use.
 *
 * Usage: bun scripts/sync_jsr.ts [--check]
 *   --check  exit non-zero instead of writing when a deno.json is out of date
 *
 * @module
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = join(import.meta.dir, "..");
const packagesDir = join(root, "packages");
const check = process.argv.includes("--check");

interface Manifest {
  name: string;
  version: string;
  exports: Record<string, { bun: string }>;
  dependencies?: Record<string, string>;
}

const manifests = new Map<string, Manifest>();
for (const dir of readdirSync(packagesDir)) {
  manifests.set(
    dir,
    JSON.parse(readFileSync(join(packagesDir, dir, "package.json"), "utf8")),
  );
}
const siblings = new Map(
  [...manifests.values()].map((m) => [m.name, m]),
);
const jsrName = (npmName: string) =>
  npmName.replace(/^@probitas-test\//, "@probitas/");

let stale = 0;
for (const [dir, m] of manifests) {
  const imports: Record<string, string> = {};
  for (const [name, range] of Object.entries(m.dependencies ?? {})) {
    const sibling = siblings.get(name);
    if (sibling) {
      // List every subpath export explicitly: for a "pkg/" prefix entry, Deno
      // prefers the workspace package.json (and its dist/ exports) instead.
      const target = `jsr:${jsrName(name)}@^${sibling.version}`;
      for (const key of Object.keys(sibling.exports)) {
        imports[key === "." ? name : `${name}/${key.slice(2)}`] = key === "."
          ? target
          : `${target}/${key.slice(2)}`;
      }
    } else {
      const target = `npm:${name}@${range}`;
      imports[name] = target;
      imports[`${name}/`] = `${target}/`;
    }
  }
  const denoJson = {
    name: jsrName(m.name),
    version: m.version,
    license: "MIT",
    exports: Object.fromEntries(
      Object.entries(m.exports).map(([key, value]) => [key, value.bun]),
    ),
    imports,
    publish: {
      exclude: [
        "**/*_test.ts",
        "**/_testutils.ts",
        "**/testkit.ts",
        "dist",
        "node_modules",
        "package.json",
      ],
    },
  };
  const path = join(packagesDir, dir, "deno.json");
  const next = JSON.stringify(denoJson, null, 2) + "\n";
  let current = "";
  try {
    current = readFileSync(path, "utf8");
  } catch {
    // Missing manifest counts as stale.
  }
  if (current === next) continue;
  stale++;
  if (check) {
    console.error(`out of date: packages/${dir}/deno.json`);
  } else {
    writeFileSync(path, next);
    console.log(`wrote packages/${dir}/deno.json`);
  }
}
if (check && stale > 0) {
  console.error("run `bun scripts/sync_jsr.ts` to regenerate");
  process.exit(1);
}
