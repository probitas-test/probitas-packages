import { assertEquals, assertInstanceOf } from "@std/assert";
import {
  AbortError,
  ClientError,
  ConnectionError,
  TimeoutError,
} from "./errors.ts";

Deno.test("ClientError", async (t) => {
  await t.step("has correct name and kind", () => {
    const error = new ClientError("test message", "unknown");
    assertEquals(error.name, "ClientError");
    assertEquals(error.kind, "unknown");
    assertEquals(error.message, "test message");
  });

  await t.step("supports cause option", () => {
    const cause = new Error("original");
    const error = new ClientError("wrapped", "unknown", { cause });
    assertEquals(error.cause, cause);
  });
});

Deno.test("ConnectionError", async (t) => {
  await t.step("extends ClientError", () => {
    const error = new ConnectionError("connection failed");
    assertInstanceOf(error, ClientError);
    assertInstanceOf(error, ConnectionError);
  });

  await t.step("has correct name and kind", () => {
    const error = new ConnectionError("connection failed");
    assertEquals(error.name, "ConnectionError");
    assertEquals(error.kind, "connection");
    assertEquals(error.message, "connection failed");
  });

  await t.step("supports cause option", () => {
    const cause = new Error("ECONNREFUSED");
    const error = new ConnectionError("connection failed", { cause });
    assertEquals(error.cause, cause);
  });
});

Deno.test("TimeoutError", async (t) => {
  await t.step("extends ClientError", () => {
    const error = new TimeoutError("operation timed out", 5000);
    assertInstanceOf(error, ClientError);
    assertInstanceOf(error, TimeoutError);
  });

  await t.step("has correct name, kind, and timeoutMs", () => {
    const error = new TimeoutError("operation timed out", 5000);
    assertEquals(error.name, "TimeoutError");
    assertEquals(error.kind, "timeout");
    assertEquals(error.message, "operation timed out");
    assertEquals(error.timeoutMs, 5000);
  });

  await t.step("supports cause option", () => {
    const cause = new Error("deadline exceeded");
    const error = new TimeoutError("operation timed out", 3000, { cause });
    assertEquals(error.cause, cause);
    assertEquals(error.timeoutMs, 3000);
  });
});

Deno.test("AbortError", async (t) => {
  await t.step("extends ClientError", () => {
    const error = new AbortError("operation aborted");
    assertInstanceOf(error, ClientError);
    assertInstanceOf(error, AbortError);
  });

  await t.step("has correct name and kind", () => {
    const error = new AbortError("operation aborted");
    assertEquals(error.name, "AbortError");
    assertEquals(error.kind, "abort");
    assertEquals(error.message, "operation aborted");
  });

  await t.step("supports cause option", () => {
    const cause = new DOMException("signal aborted", "AbortError");
    const error = new AbortError("operation aborted", { cause });
    assertEquals(error.cause, cause);
  });
});
