/**
 * Pack every package into `dist-pack/` with `bun pm pack`.
 *
 * `bun pm pack` replaces `workspace:*` with the sibling's version, which is
 * what `bun publish` uploads, so the tarballs double as a publish dry run.
 * Run `bun scripts/build.ts` first.
 *
 * Usage: bun scripts/pack.ts
 *
 * @module
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = join(import.meta.dir, "..");
const out = join(root, "dist-pack");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const dir of readdirSync(join(root, "packages"))) {
  const result = spawnSync(
    process.execPath,
    ["pm", "pack", "--destination", out, "--quiet"],
    { cwd: join(root, "packages", dir), stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(readdirSync(out).join("\n"));
