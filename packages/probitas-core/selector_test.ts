/**
 * Tests for selector functions
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import type { ScenarioDefinition } from "./types.ts";
import { applySelectors, parseSelector } from "./selector.ts";
import { test } from "@probitas-test/internal-testing";

// Test helper to create scenario
const createScenario = (
  name: string,
  tags: string[] = [],
): ScenarioDefinition => ({
  name,
  tags,
  steps: [],
});

test("parseSelector parses tag selector without negation", () => {
  const selectors = parseSelector("tag:smoke");
  assertEquals(selectors.length, 1);
  assertEquals(selectors[0].type, "tag");
  assertEquals(selectors[0].negated, false);
});

test("parseSelector parses name selector without negation", () => {
  const selectors = parseSelector("Login");
  assertEquals(selectors.length, 1);
  assertEquals(selectors[0].type, "name");
  assertEquals(selectors[0].negated, false);
});

test("parseSelector parses selector with ! negation", () => {
  const selectors = parseSelector("!tag:slow");
  assertEquals(selectors.length, 1);
  assertEquals(selectors[0].type, "tag");
  assertEquals(selectors[0].negated, true);
});

test("parseSelector parses multiple selectors with comma", () => {
  const selectors = parseSelector("tag:api,!tag:slow");
  assertEquals(selectors.length, 2);
  assertEquals(selectors[0].type, "tag");
  assertEquals(selectors[0].negated, false);
  assertEquals(selectors[1].type, "tag");
  assertEquals(selectors[1].negated, true);
});

test("parseSelector handles whitespace around !", () => {
  const selectors = parseSelector("! tag:slow");
  assertEquals(selectors.length, 1);
  assertEquals(selectors[0].negated, true);
});

test("parseSelector defaults to name type when no type specified", () => {
  const selectors = parseSelector("wip");
  assertEquals(selectors.length, 1);
  assertEquals(selectors[0].type, "name");
});

test("parseSelector handles ! prefix with default type", () => {
  const selectors = parseSelector("!wip");
  assertEquals(selectors.length, 1);
  assertEquals(selectors[0].type, "name");
  assertEquals(selectors[0].negated, true);
});

test("applySelectors applies single tag selector (OR)", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["tag:smoke"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "Smoke Test");
});

test("applySelectors applies multiple tag selectors (OR)", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["tag:auth", "tag:smoke"]);
  assertEquals(result.length, 2);
  assertEquals(result.map((s) => s.name).sort(), [
    "Login Test",
    "Smoke Test",
  ]);
});

test("applySelectors applies combined selectors (AND within selector)", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["tag:api,tag:auth"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "Login Test");
});

test("applySelectors applies name selector", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["User"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "User API Test");
});

test("applySelectors returns all scenarios when no selectors", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, []);
  assertEquals(result.length, 4);
});

test("applySelectors filters out scenarios with negated tag", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["!tag:smoke"]);
  assertEquals(result.length, 3);
  assertEquals(result.map((s) => s.name).sort(), [
    "Login Test",
    "Logout Test",
    "User API Test",
  ]);
});

test("applySelectors filters out scenarios with negated name", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["!Logout"]);
  assertEquals(result.length, 3);
  assertEquals(result.map((s) => s.name).sort(), [
    "Login Test",
    "Smoke Test",
    "User API Test",
  ]);
});

test("applySelectors applies AND condition with negation: tag:api,!tag:auth", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["tag:api,!tag:auth"]);
  assertEquals(result.length, 2);
  assertEquals(result.map((s) => s.name).sort(), [
    "Logout Test",
    "User API Test",
  ]);
});

test("applySelectors applies OR condition with negation", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["!tag:api", "!tag:smoke"]);
  // !tag:api matches Smoke Test
  // !tag:smoke matches Login Test, Logout Test, User API Test
  // OR => all 4 scenarios
  assertEquals(result.length, 4);
});

test("applySelectors applies complex condition: tag:api,!tag:auth,User", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["tag:api,!tag:auth,User"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "User API Test");
});

test("applySelectors handles selector with only negation", () => {
  const scenarios = [
    createScenario("Login Test", ["api", "auth"]),
    createScenario("Logout Test", ["api"]),
    createScenario("User API Test", ["api", "user"]),
    createScenario("Smoke Test", ["smoke"]),
  ];
  const result = applySelectors(scenarios, ["!tag:nonexistent"]);
  assertEquals(result.length, 4); // All scenarios pass (none have nonexistent tag)
});
