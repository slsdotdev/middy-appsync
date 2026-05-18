import { describe, expect, it } from "vitest";
import { createResolver } from "./createResolver.js";
import { defineResolvers } from "./defineResolvers.js";

const r1 = createResolver({ typeName: "Query", fieldName: "a", resolve: () => null });
const r2 = createResolver({ typeName: "Query", fieldName: "b", resolve: () => null });
const r3 = createResolver({ typeName: "Query", fieldName: "c", resolve: () => null });

describe("defineResolvers", () => {
  it("returns a flat list when given individual resolvers", () => {
    expect(defineResolvers(r1, r2, r3)).toEqual([r1, r2, r3]);
  });

  it("flattens nested arrays one level deep", () => {
    expect(defineResolvers([r1, r2], r3)).toEqual([r1, r2, r3]);
    expect(defineResolvers(r1, [r2, r3])).toEqual([r1, r2, r3]);
    expect(defineResolvers([r1], [r2], [r3])).toEqual([r1, r2, r3]);
  });

  it("returns an empty array when called with no arguments", () => {
    expect(defineResolvers()).toEqual([]);
  });
});
