/**
 * Build every package for npm: JavaScript plus declarations into `dist/`.
 *
 * Inside the workspace, Bun and tsc resolve packages through the `bun` export
 * condition straight to the TypeScript sources, so nothing needs building for
 * development or tests. Published packages keep that condition for Bun
 * consumers and add `types` / `default` entries pointing at `dist/` for
 * everyone else.
 *
 * Packages are built in dependency order so that each one compiles against its
 * siblings' emitted declarations, not their sources.
 *
 * Usage: bun scripts/build.ts
 *
 * @module
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = join(import.meta.dir, "..");
const packagesDir = join(root, "packages");
const TEST_FILES = ["**/*_test.ts", "**/_testutils.ts", "**/testkit.ts"];

interface Manifest {
  name: string;
  dependencies?: Record<string, string>;
}

const packages = readdirSync(packagesDir).map((dir) => {
  const manifest: Manifest = JSON.parse(
    readFileSync(join(packagesDir, dir, "package.json"), "utf8"),
  );
  return { dir, manifest };
});
const byName = new Map(packages.map((p) => [p.manifest.name, p]));

function buildOrder(): typeof packages {
  const order: typeof packages = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (pkg: (typeof packages)[number]) => {
    const s = state.get(pkg.manifest.name);
    if (s === "done") return;
    if (s === "visiting") throw new Error(`cycle at ${pkg.manifest.name}`);
    state.set(pkg.manifest.name, "visiting");
    for (const dep of Object.keys(pkg.manifest.dependencies ?? {})) {
      const sibling = byName.get(dep);
      if (sibling) visit(sibling);
    }
    state.set(pkg.manifest.name, "done");
    order.push(pkg);
  };
  packages.forEach(visit);
  return order;
}

for (const { dir, manifest } of buildOrder()) {
  const pkgDir = join(packagesDir, dir);
  rmSync(join(pkgDir, "dist"), { recursive: true, force: true });
  // npm and JSR both expect a LICENSE at the package root.
  copyFileSync(join(root, "LICENSE"), join(pkgDir, "LICENSE"));
  const configPath = join(pkgDir, "tsconfig.build.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      extends: "../../tsconfig.json",
      compilerOptions: {
        noEmit: false,
        declaration: true,
        rewriteRelativeImportExtensions: true,
        // Resolve siblings through `types` (their dist/), not `bun` (sources).
        customConditions: [],
        rootDir: ".",
        outDir: "dist",
      },
      include: ["**/*.ts"],
      exclude: ["dist", "node_modules", ...TEST_FILES],
    }),
  );
  const result = spawnSync(
    join(root, "node_modules", ".bin", "tsc"),
    ["-p", configPath],
    { stdio: "inherit" },
  );
  rmSync(configPath);
  if (result.status !== 0) {
    console.error(`build failed: ${manifest.name}`);
    process.exit(result.status ?? 1);
  }
  console.log(`built ${manifest.name}`);
}
