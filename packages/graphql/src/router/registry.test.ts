import { describe, expect, it } from "vitest";
import { createResolver } from "../resolvers/createResolver.js";
import { createRouterRegistry } from "./registry.js";

const getUser = createResolver({
  typeName: "Query",
  fieldName: "getUser",
  resolve: () => ({ id: "1" }),
});

const listUsers = createResolver({
  typeName: "Query",
  fieldName: "listUsers",
  resolve: () => [],
});

describe("createRouterRegistry", () => {
  it("returns undefined for an unregistered key", () => {
    const registry = createRouterRegistry();

    expect(registry.get("Query", "getUser")).toBeUndefined();
  });

  it("retrieves a registered resolver by typeName + fieldName", () => {
    const registry = createRouterRegistry();
    registry.register(getUser);

    expect(registry.get("Query", "getUser")).toBe(getUser);
  });

  it("keeps separate entries per (typeName, fieldName) pair", () => {
    const registry = createRouterRegistry();
    registry.register(getUser);
    registry.register(listUsers);

    expect(registry.get("Query", "getUser")).toBe(getUser);
    expect(registry.get("Query", "listUsers")).toBe(listUsers);
  });

  it("overwrites when registering the same (typeName, fieldName) twice", () => {
    const registry = createRouterRegistry();
    const replacement = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => ({ id: "replacement" }),
    });

    registry.register(getUser);
    registry.register(replacement);

    expect(registry.get("Query", "getUser")).toBe(replacement);
  });

  it("does not collide across typeNames with the same fieldName", () => {
    const registry = createRouterRegistry();
    const queryById = createResolver({
      typeName: "Query",
      fieldName: "byId",
      resolve: () => null,
    });
    const mutationById = createResolver({
      typeName: "Mutation",
      fieldName: "byId",
      resolve: () => null,
    });

    registry.register(queryById);
    registry.register(mutationById);

    expect(registry.get("Query", "byId")).toBe(queryById);
    expect(registry.get("Mutation", "byId")).toBe(mutationById);
  });
});
