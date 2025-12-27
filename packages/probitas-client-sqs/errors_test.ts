import { assertEquals, assertInstanceOf } from "@std/assert";
import { ClientError } from "@probitas/client";
import {
  SqsBatchError,
  SqsCommandError,
  SqsConnectionError,
  SqsError,
  SqsMessageNotFoundError,
  SqsMessageTooLargeError,
  SqsQueueNotFoundError,
} from "./errors.ts";

Deno.test("SqsError", async (t) => {
  await t.step("extends ClientError", () => {
    const error = new SqsError("test message");
    assertInstanceOf(error, ClientError);
    assertInstanceOf(error, Error);
  });

  await t.step("has correct properties", () => {
    const error = new SqsError("test message", "test-kind", {
      code: "TEST001",
    });
    assertEquals(error.name, "SqsError");
    assertEquals(error.message, "test message");
    assertEquals(error.kind, "test-kind");
    assertEquals(error.code, "TEST001");
  });

  await t.step("supports error cause", () => {
    const cause = new Error("original error");
    const error = new SqsError("wrapped", "sqs", { cause });
    assertEquals(error.cause, cause);
  });
});

Deno.test("SqsConnectionError", async (t) => {
  await t.step("extends SqsError", () => {
    const error = new SqsConnectionError("connection failed");
    assertInstanceOf(error, SqsError);
    assertInstanceOf(error, ClientError);
  });

  await t.step("has correct properties", () => {
    const error = new SqsConnectionError("connection failed");
    assertEquals(error.name, "SqsConnectionError");
    assertEquals(error.kind, "connection");
    assertEquals(error.message, "connection failed");
  });
});

Deno.test("SqsCommandError", async (t) => {
  await t.step("extends SqsError", () => {
    const error = new SqsCommandError("command failed", {
      operation: "send",
    });
    assertInstanceOf(error, SqsError);
  });

  await t.step("has correct properties", () => {
    const error = new SqsCommandError("command failed", {
      operation: "send",
      code: "ERR001",
    });
    assertEquals(error.name, "SqsCommandError");
    assertEquals(error.kind, "command");
    assertEquals(error.operation, "send");
    assertEquals(error.code, "ERR001");
  });
});

Deno.test("SqsQueueNotFoundError", async (t) => {
  await t.step("extends SqsError", () => {
    const error = new SqsQueueNotFoundError(
      "queue not found",
      "https://sqs.us-east-1.amazonaws.com/123/my-queue",
    );
    assertInstanceOf(error, SqsError);
  });

  await t.step("has correct properties", () => {
    const queueUrl = "https://sqs.us-east-1.amazonaws.com/123/my-queue";
    const error = new SqsQueueNotFoundError("queue not found", queueUrl);
    assertEquals(error.name, "SqsQueueNotFoundError");
    assertEquals(error.kind, "queue_not_found");
    assertEquals(error.queueUrl, queueUrl);
  });
});

Deno.test("SqsMessageNotFoundError", async (t) => {
  await t.step("extends SqsError", () => {
    const error = new SqsMessageNotFoundError("message not found");
    assertInstanceOf(error, SqsError);
  });

  await t.step("has correct properties", () => {
    const error = new SqsMessageNotFoundError("message not found");
    assertEquals(error.name, "SqsMessageNotFoundError");
    assertEquals(error.kind, "message_not_found");
  });
});

Deno.test("SqsMessageTooLargeError", async (t) => {
  await t.step("extends SqsError", () => {
    const error = new SqsMessageTooLargeError(
      "message too large",
      300000,
      262144,
    );
    assertInstanceOf(error, SqsError);
  });

  await t.step("has correct properties", () => {
    const error = new SqsMessageTooLargeError(
      "message too large",
      300000,
      262144,
    );
    assertEquals(error.name, "SqsMessageTooLargeError");
    assertEquals(error.kind, "message_too_large");
    assertEquals(error.size, 300000);
    assertEquals(error.maxSize, 262144);
  });
});

Deno.test("SqsBatchError", async (t) => {
  await t.step("extends SqsError", () => {
    const error = new SqsBatchError("batch operation failed", 3);
    assertInstanceOf(error, SqsError);
  });

  await t.step("has correct properties", () => {
    const error = new SqsBatchError("batch operation failed", 3);
    assertEquals(error.name, "SqsBatchError");
    assertEquals(error.kind, "batch");
    assertEquals(error.failedCount, 3);
  });
});
