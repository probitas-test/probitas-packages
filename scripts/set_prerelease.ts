/**
 * Append a prerelease suffix to every package version, in place.
 *
 * Used by the "Publish next" workflow on a throwaway checkout; the change is
 * never committed. `workspace:*` dependencies follow automatically because
 * `bun pm pack` replaces them with the sibling's (now suffixed) version.
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

const packagesDir = join(import.meta.dir, "..", "packages");
for (const dir of readdirSync(packagesDir)) {
  const path = join(packagesDir, dir, "package.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.version = `${manifest.version.replace(/-.*$/, "")}-${suffix}`;
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${manifest.name}@${manifest.version}`);
}
