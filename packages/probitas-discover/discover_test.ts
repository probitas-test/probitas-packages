/**
 * Tests for scenario file discovery
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { relative } from "@std/path";
import { type DiscoverProgress, discoverScenarioFiles } from "./discover.ts";
import { sandbox, test } from "@probitas-test/internal-testing";
import { mkdir, writeFile } from "node:fs/promises";

test("discover discoverScenarioFiles discovers files from directory with default pattern", async () => {
  await using sbox = await sandbox();

  await writeFile(sbox.resolve("test1.probitas.ts"), "");
  await writeFile(sbox.resolve("test2.probitas.ts"), "");
  await writeFile(sbox.resolve("other.ts"), "");

  const files = await discoverScenarioFiles([sbox.path], {});

  assertEquals(files.length, 2);
  assertEquals(files.map((f) => relative(sbox.path, f)).sort(), [
    "test1.probitas.ts",
    "test2.probitas.ts",
  ]);
});

test("discover discoverScenarioFiles discovers files from specified directory", async () => {
  await using sbox = await sandbox();

  await mkdir(sbox.resolve("api"), { recursive: true });
  await mkdir(sbox.resolve("e2e"), { recursive: true });

  await writeFile(sbox.resolve("api/test.probitas.ts"), "");
  await writeFile(sbox.resolve("e2e/test.probitas.ts"), "");

  const files = await discoverScenarioFiles([sbox.path], {});

  assertEquals(files.length, 2);
  assertEquals(files.map((f) => relative(sbox.path, f)).sort(), [
    "api/test.probitas.ts",
    "e2e/test.probitas.ts",
  ]);
});

test("discover discoverScenarioFiles discovers from specific file path", async () => {
  await using sbox = await sandbox();

  const testFile = sbox.resolve("test.probitas.ts");
  await writeFile(testFile, "");

  const files = await discoverScenarioFiles([testFile], {});

  assertEquals(files.length, 1);
  assertEquals(files[0], testFile);
});

test("discover discoverScenarioFiles discovers from directory with custom includes", async () => {
  await using sbox = await sandbox();

  await mkdir(sbox.resolve("api"), { recursive: true });
  await mkdir(sbox.resolve("e2e"), { recursive: true });

  await writeFile(sbox.resolve("api/test.probitas.ts"), "");
  await writeFile(sbox.resolve("e2e/test.probitas.ts"), "");

  const apiDir = sbox.resolve("api");
  const files = await discoverScenarioFiles([apiDir], {});

  assertEquals(files.length, 1);
  assertEquals(relative(sbox.path, files[0]), "api/test.probitas.ts");
});

test("discover discoverScenarioFiles uses exclude patterns", async () => {
  await using sbox = await sandbox();

  await writeFile(sbox.resolve("test.probitas.ts"), "");
  await writeFile(sbox.resolve("skip.probitas.ts"), "");

  const files = await discoverScenarioFiles([sbox.path], {
    excludes: ["**/skip.probitas.ts"],
  });

  assertEquals(files.length, 1);
  assertEquals(relative(sbox.path, files[0]), "test.probitas.ts");
});

test("discover discoverScenarioFiles combines multiple paths", async () => {
  await using sbox = await sandbox();

  const file1 = sbox.resolve("test1.probitas.ts");
  const file2 = sbox.resolve("test2.probitas.ts");
  await writeFile(file1, "");
  await writeFile(file2, "");

  const files = await discoverScenarioFiles([file1, file2], {});

  assertEquals(files.length, 2);
  assertEquals(files.sort(), [file1, file2].sort());
});

test("discover discoverScenarioFiles returns sorted file paths", async () => {
  await using sbox = await sandbox();

  await writeFile(sbox.resolve("z.probitas.ts"), "");
  await writeFile(sbox.resolve("a.probitas.ts"), "");
  await writeFile(sbox.resolve("m.probitas.ts"), "");

  const files = await discoverScenarioFiles([sbox.path], {});

  assertEquals(files.map((f) => relative(sbox.path, f)), [
    "a.probitas.ts",
    "m.probitas.ts",
    "z.probitas.ts",
  ]);
});

test("discover discoverScenarioFiles calls onProgress callback for directories", async () => {
  await using sbox = await sandbox();

  await mkdir(sbox.resolve("dir1"), { recursive: true });
  await mkdir(sbox.resolve("dir2"), { recursive: true });

  await writeFile(sbox.resolve("dir1/test1.probitas.ts"), "");
  await writeFile(sbox.resolve("dir2/test2.probitas.ts"), "");

  const progressEvents: DiscoverProgress[] = [];

  const files = await discoverScenarioFiles(
    [sbox.resolve("dir1"), sbox.resolve("dir2")],
    {
      onProgress: (progress) => {
        progressEvents.push({ ...progress });
      },
    },
  );

  // Progress is reported at start of each directory scan
  assertEquals(progressEvents.length >= 2, true);
  // Both files should be discovered
  assertEquals(files.length, 2);
});

test("discover discoverScenarioFiles calls onProgress callback for files", async () => {
  await using sbox = await sandbox();

  const file1 = sbox.resolve("test1.probitas.ts");
  const file2 = sbox.resolve("test2.probitas.ts");
  await writeFile(file1, "");
  await writeFile(file2, "");

  const progressEvents: DiscoverProgress[] = [];

  await discoverScenarioFiles([file1, file2], {
    onProgress: (progress) => {
      progressEvents.push({ ...progress });
    },
  });

  assertEquals(progressEvents.length, 2);
  assertEquals(progressEvents[0].currentPath, file1);
  assertEquals(progressEvents[0].filesFound, 1);
  assertEquals(progressEvents[1].currentPath, file2);
  assertEquals(progressEvents[1].filesFound, 2);
});
