/**
 * Test utilities for mixin tests
 *
 * @module
 */

import { removeColors } from "@probitas-test/core/theme";
import {
  assertSnapshot,
  type TestContext,
} from "@probitas-test/internal-testing";

/**
 * Assert snapshot after removing ANSI color codes from the actual value.
 *
 * This ensures consistent snapshot comparisons across environments
 * regardless of terminal color settings.
 *
 * @param context - Test context from `test()`
 * @param actual - The string to compare (color codes will be removed)
 */
export async function assertSnapshotWithoutColors(
  context: TestContext,
  actual: string,
): Promise<void> {
  await assertSnapshot(context, removeColors(actual));
}
