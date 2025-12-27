/**
 * Base error class for all client errors.
 *
 * The `kind` property is typed as `string` to allow client-specific packages
 * to define their own error kinds without modifying this core package.
 * Subclasses can narrow the type using literal types with `as const`.
 */
export class ClientError extends Error {
  override readonly name: string = "ClientError";
  readonly kind: string;

  constructor(
    message: string,
    kind: string = "unknown",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.kind = kind;
  }
}

/**
 * Error thrown when a connection cannot be established.
 */
export class ConnectionError extends ClientError {
  override readonly name = "ConnectionError";
  override readonly kind = "connection" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, "connection", options);
  }
}

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends ClientError {
  override readonly name = "TimeoutError";
  override readonly kind = "timeout" as const;
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, options?: ErrorOptions) {
    super(message, "timeout", options);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when an operation is aborted via AbortSignal.
 */
export class AbortError extends ClientError {
  override readonly name = "AbortError";
  override readonly kind = "abort" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, "abort", options);
  }
}
