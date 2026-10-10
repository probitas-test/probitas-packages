/**
 * Write the versions of a release plan into every package.json, in place.
 *
 * Used by the Publish workflow on a throwaway checkout; the change is never
 * committed. Released packages get their planned version (with `--suffix`
 * for prereleases: `0.6.0-next.42`), and the others their latest released
 * version. Sibling `workspace:*` dependencies are rewritten to those exact
 * versions here rather than left to `bun pm pack`, which resolves
 * `workspace:*` from the versions recorded in bun.lock, not from the edited
 * manifests.
 *
 * Usage: bun scripts/apply_versions.ts --plan versions.json [--suffix next.42]
 *
 * @module
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import type { PlannedPackage, ReleasePlan } from "./release_plan.ts";

/**
 * Version each package gets in this build
 *
 * @throws Error for a package that is neither released nor published before,
 *   since its dependents could not pin it
 */
export function buildVersions(
  packages: readonly PlannedPackage[],
  suffix?: string,
): Map<string, string> {
  return new Map(packages.map((p) => {
    if (p.to) return [p.name, suffix ? `${p.to}-${suffix}` : p.to];
    if (p.from) return [p.name, p.from];
    throw new Error(`${p.name} has never been released and is not planned`);
  }));
}

function main(): void {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      plan: { type: "string" },
      suffix: { type: "string" },
    },
  });
  if (!values.plan) {
    console.error(
      "usage: bun scripts/apply_versions.ts --plan <file> [--suffix <suffix>]",
    );
    process.exit(1);
  }
  if (values.suffix && !/^[0-9A-Za-z.-]+$/.test(values.suffix)) {
    console.error(`invalid suffix: ${values.suffix}`);
    process.exit(1);
  }
  const plan: ReleasePlan = JSON.parse(readFileSync(values.plan, "utf8"));
  const versions = buildVersions(plan.packages, values.suffix);
  const packagesDir = join(import.meta.dir, "..", "packages");
  for (const p of plan.packages) {
    const path = join(packagesDir, p.dir, "package.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.version = versions.get(p.name);
    for (
      const [name, range] of Object.entries<string>(manifest.dependencies ?? {})
    ) {
      if (!range.startsWith("workspace:")) continue;
      const version = versions.get(name);
      if (!version) throw new Error(`${p.name}: unknown sibling ${name}`);
      manifest.dependencies[name] = version;
    }
    writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`${p.name}@${manifest.version}${p.to ? "" : " (unchanged)"}`);
  }
}

if (import.meta.main) main();
