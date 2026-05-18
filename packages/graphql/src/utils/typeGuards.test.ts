import { describe, expect, it } from "vitest";
import { hasProperty, isDefined, isNumber, isRecord, isString } from "./typeGuards.js";

describe("isRecord", () => {
  it("accepts plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("rejects arrays, null, primitives and undefined", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });
});

describe("isString", () => {
  it("accepts strings only", () => {
    expect(isString("")).toBe(true);
    expect(isString("hello")).toBe(true);
    expect(isString(42)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString({})).toBe(false);
  });
});

describe("isNumber", () => {
  it("accepts numbers only", () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1)).toBe(true);
    expect(isNumber(1.5)).toBe(true);
    expect(isNumber(NaN)).toBe(true);
    expect(isNumber("1")).toBe(false);
    expect(isNumber(null)).toBe(false);
    expect(isNumber(undefined)).toBe(false);
  });
});

describe("isDefined", () => {
  it("rejects null and undefined, accepts everything else", () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined({})).toBe(true);
    expect(isDefined([])).toBe(true);
  });
});

describe("hasProperty", () => {
  it("returns true for own properties", () => {
    const obj = { foo: 1 };
    expect(hasProperty(obj, "foo")).toBe(true);
  });

  it("returns false for missing properties", () => {
    const obj = { foo: 1 };
    expect(hasProperty(obj, "bar")).toBe(false);
  });

  it("returns false for inherited properties", () => {
    const obj = Object.create({ inherited: 1 });
    expect(hasProperty(obj, "inherited")).toBe(false);
  });
});
