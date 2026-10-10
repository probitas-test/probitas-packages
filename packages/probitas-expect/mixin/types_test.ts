import type { Origin } from "@probitas-test/core/origin";
import type { Theme } from "@probitas-test/core/theme";
import { assertType, type IsExact } from "@std/testing/types";
import type { Unit } from "./_typeutils.ts";
import type {
  ExtractMethodBase,
  MixinApplied,
  MixinConfig,
  MixinDefinition,
} from "./types.ts";
import { test } from "@probitas-test/internal-testing";

test("MixinConfig - type check with default methodBase", () => {
  type Config = MixinConfig<"string">;
  type Expected = {
    readonly valueName: "string";
    readonly methodBase?: "String";
    readonly expectOrigin?: Origin;
    readonly theme?: Theme;
    readonly subject?: unknown;
  };
  assertType<IsExact<Config, Expected>>(true);
});

test("MixinConfig - type check with custom methodBase", () => {
  type Config = MixinConfig<"custom_type", "CustomType">;
  type Expected = {
    readonly valueName: "custom_type";
    readonly methodBase?: "CustomType";
    readonly expectOrigin?: Origin;
    readonly theme?: Theme;
    readonly subject?: unknown;
  };
  assertType<IsExact<Config, Expected>>(true);
});

test("ExtractMethodBase - with explicit methodBase", () => {
  type Config = { readonly valueName: "array"; readonly methodBase: "Array" };
  type Extracted = ExtractMethodBase<Config>;
  type Expected = "Array";
  assertType<IsExact<Extracted, Expected>>(true);
});

test("ExtractMethodBase - without methodBase (uses PascalCase)", () => {
  type Config = { readonly valueName: "string" };
  type Extracted = ExtractMethodBase<Config>;
  type Expected = "String";
  assertType<IsExact<Extracted, Expected>>(true);
});

test("ExtractMethodBase - complex valueName converted to PascalCase", () => {
  type Config = { readonly valueName: "one_of_value" };
  type Extracted = ExtractMethodBase<Config>;
  type Expected = "OneOfValue";
  assertType<IsExact<Extracted, Expected>>(true);
});

test("MixinDefinition - empty array", () => {
  type Definition = MixinDefinition<[]>;
  type Expected = Unit;
  assertType<IsExact<Definition, Expected>>(true);
});

test("MixinDefinition - single method", () => {
  type Definition = MixinDefinition<
    [["toBeString", () => void]]
  >;
  type Expected = {
    toBeString: () => void;
  };
  assertType<IsExact<Definition, Expected>>(true);
});

test("MixinDefinition - multiple methods", () => {
  type Definition = MixinDefinition<
    [
      ["toBeString", () => void],
      ["toHaveLength", (length: number) => void],
      ["toMatch", (pattern: RegExp) => void],
    ]
  >;
  type Expected = {
    toBeString: () => void;
    toHaveLength: (length: number) => void;
    toMatch: (pattern: RegExp) => void;
  };
  assertType<IsExact<Definition, Expected>>(true);
});

test("MixinDefinition - with chainable methods", () => {
  type Self = { value: string };
  type Definition = MixinDefinition<
    [
      ["toBeString", (this: Self) => Self],
      ["toHaveLength", (this: Self, length: number) => Self],
    ]
  >;
  type Expected = {
    toBeString: (this: Self) => Self;
    toHaveLength: (this: Self, length: number) => Self;
  };
  assertType<IsExact<Definition, Expected>>(true);
});

test("MixinApplied - simple mixin application", () => {
  type Base = {
    value: unknown;
  };
  type Mixin = MixinDefinition<
    [["toBeString", () => void]]
  >;
  type Applied = MixinApplied<Base, Mixin>;
  type Expected = {
    value: unknown;
    toBeString: () => void;
  };
  assertType<IsExact<Applied, Expected>>(true);
});

test("MixinApplied - with chainable methods", () => {
  type Base = {
    value: unknown;
  };
  type Mixin = MixinDefinition<
    [
      ["chainMethod", (this: Base & Mixin, arg: string) => Base & Mixin],
      ["normalMethod", (arg: number) => number],
    ]
  >;
  type Applied = MixinApplied<Base, Mixin>;
  type Expected = {
    value: unknown;
    chainMethod: (this: Expected, arg: string) => Expected;
    normalMethod: (arg: number) => number;
  };
  assertType<IsExact<Applied, Expected>>(true);
});

test("MixinApplied - multiple mixins composition", () => {
  type Base = {
    value: unknown;
  };
  type Mixin1 = MixinDefinition<
    [["method1", (this: Base & Mixin1) => Base & Mixin1]]
  >;
  type Mixin2 = MixinDefinition<
    [["method2", (this: Base & Mixin1 & Mixin2) => Base & Mixin1 & Mixin2]]
  >;
  type Applied = MixinApplied<MixinApplied<Base, Mixin1>, Mixin2>;
  type Expected = {
    value: unknown;
    method1: (this: Expected) => Expected;
    method2: (this: Expected) => Expected;
  };
  assertType<IsExact<Applied, Expected>>(true);
});
