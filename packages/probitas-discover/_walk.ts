import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface WalkEntry {
  path: string;
}

export interface WalkOptions {
  /** Paths (files or directories) matching any of these are not visited */
  skip?: readonly RegExp[];
}

/**
 * Recursively yield regular files under `root`
 *
 * Replaces `@std/fs/walk`, which calls `Deno.*` directly. Symlinks are not
 * followed, matching `walk()`'s default.
 */
export async function* walk(
  root: string,
  options: WalkOptions = {},
): AsyncGenerator<WalkEntry> {
  const skip = options.skip ?? [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (skip.some((re) => re.test(path))) continue;
    if (entry.isDirectory()) {
      yield* walk(path, options);
    } else if (entry.isFile()) {
      yield { path };
    }
  }
}
