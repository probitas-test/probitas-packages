/**
 * Retry utilities for handling transient failures
 *
 * This module provides retry logic with configurable backoff strategies,
 * useful for handling flaky network calls or temporary service unavailability.
 *
 * @module
 */

import { delay } from "@std/async/delay";

/**
 * Configuration options for retry behavior
 */
export type RetryOptions = {
  /** Maximum number of attempts (default: 1, meaning no retries) */
  maxAttempts?: number;

  /**
   * Backoff strategy between retries.
   * - "linear": 1s, 2s, 3s, 4s...
   * - "exponential": 1s, 2s, 4s, 8s...
   * @default "linear"
   */
  backoff?: "linear" | "exponential";

  /** AbortSignal to cancel retry delays */
  signal?: AbortSignal;

  /**
   * Predicate to determine if retry should continue after an error.
   * Return false to stop retrying immediately.
   *
   * @param error - The raw error that occurred (not converted to Error)
   * @param attempt - The 1-based attempt number that just failed
   * @returns true to continue retrying, false to stop immediately
   * @default Always returns true (retry all errors)
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

/**
 * Execute a function with retry logic
 *
 * Attempts to execute the provided function, retrying on failure according to the
 * specified options. Delays between retries follow either linear or exponential backoff.
 *
 * @template T - Return type of the function
 * @param fn - Function to execute (receives 1-based attempt number, can be sync or async)
 * @param options - Retry configuration options
 * @returns Promise resolving to the function's return value
 * @throws The last error encountered if all retry attempts fail
 *
 * @example Retry up to 3 times with exponential backoff
 * ```ts
 * import { retry } from "./retry.ts";
 *
 * const mockFetch = async () => ({ ok: true });
 * const data = await retry(
 *   (attempt) => mockFetch(),
 *   { maxAttempts: 3, backoff: "exponential" }
 * );
 * console.log(data);
 * ```
 *
 * @example With abort signal
 * ```ts
 * import { retry } from "./retry.ts";
 *
 * const fetchData = async () => ({ status: "ok" });
 * const controller = new AbortController();
 * const data = await retry(
 *   (attempt) => fetchData(),
 *   { maxAttempts: 5, backoff: "linear", signal: controller.signal }
 * );
 * console.log(data);
 * ```
 */
export async function retry<T>(
  fn: (attempt: number) => T | Promise<T>,
  options: Readonly<RetryOptions> = {},
): Promise<T> {
  const {
    maxAttempts = 1,
    backoff = "linear",
    signal,
    shouldRetry = () => true,
  } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    signal?.throwIfAborted();

    try {
      return await fn(attempt + 1); // Pass 1-based attempt number
    } catch (error) {
      lastError = error;

      // Check if retry should continue based on raw error and attempt number
      if (!shouldRetry(error, attempt + 1)) {
        throw error;
      }

      // Don't retry if the external signal (passed to retry) is aborted.
      // This indicates the user cancelled the operation, so continuing is pointless.
      if (signal?.aborted) {
        throw error;
      }

      if (attempt < maxAttempts - 1) {
        const t = backoff === "exponential"
          ? Math.pow(2, attempt) * 1000
          : (attempt + 1) * 1000;
        await delay(t, { signal });
      }
    }
  }

  // Throw the last error as-is (preserving its original type)
  throw lastError;
}
