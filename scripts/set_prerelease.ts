/**
 * Append a prerelease suffix to every package version, in place.
 *
 * Used by the Publish workflow (`next` prereleases) on a throwaway checkout;
 * the change is never committed. Sibling `workspace:*` dependencies are
 * rewritten to the suffixed versions here as well: `bun pm pack` resolves
 * `workspace:*` from the versions recorded in bun.lock, not from the edited
 * package.json files, so leaving them would publish dependencies on unsuffixed
 * versions that do not exist on npm.
 *
 * Usage: bun scripts/set_prerelease.ts <suffix>   (e.g. next.42)
 *
 * @module
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const suffix = process.argv[2];
if (!suffix || !/^[0-9A-Za-z.-]+$/.test(suffix)) {
  console.error("usage: bun scripts/set_prerelease.ts <suffix>");
  process.exit(1);
}

interface Manifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}

const packagesDir = join(import.meta.dir, "..", "packages");
const packages = readdirSync(packagesDir).map((dir) => {
  const path = join(packagesDir, dir, "package.json");
  const manifest: Manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.version = `${manifest.version.replace(/-.*$/, "")}-${suffix}`;
  return { path, manifest };
});
const versions = new Map(
  packages.map(({ manifest }) => [manifest.name, manifest.version]),
);

for (const { path, manifest } of packages) {
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (!range.startsWith("workspace:")) continue;
    const version = versions.get(name);
    if (!version) throw new Error(`${manifest.name}: unknown sibling ${name}`);
    manifest.dependencies![name] = version;
  }
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${manifest.name}@${manifest.version}`);
}
