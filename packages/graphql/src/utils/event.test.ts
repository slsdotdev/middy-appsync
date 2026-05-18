import { mockResolverEvent, cognitoIdentity } from "@middy-appsync/internal/mocks";
import { isValidResolverEvent, normalizeEvent } from "./event.js";
import { describe, expect, it } from "vitest";

describe("isValidResolverEvent", () => {
  it("accepts a well-formed AppSync resolver event", () => {
    expect(isValidResolverEvent(mockResolverEvent())).toBe(true);
  });

  it("rejects null, undefined, primitives and arrays", () => {
    expect(isValidResolverEvent(null)).toBe(false);
    expect(isValidResolverEvent(undefined)).toBe(false);
    expect(isValidResolverEvent("event")).toBe(false);
    expect(isValidResolverEvent(123)).toBe(false);
    expect(isValidResolverEvent([])).toBe(false);
  });

  it("rejects events missing required fields", () => {
    const base = mockResolverEvent();

    expect(isValidResolverEvent({ ...base, arguments: undefined })).toBe(false);
    expect(isValidResolverEvent({ ...base, request: undefined })).toBe(false);
    expect(isValidResolverEvent({ ...base, info: undefined })).toBe(false);
    expect(isValidResolverEvent({ ...base, stash: undefined })).toBe(false);
  });

  it("rejects events with malformed info", () => {
    const base = mockResolverEvent();

    expect(
      isValidResolverEvent({
        ...base,
        info: { ...base.info, parentTypeName: 123 as unknown as string },
      })
    ).toBe(false);
    expect(
      isValidResolverEvent({
        ...base,
        info: { ...base.info, fieldName: undefined as unknown as string },
      })
    ).toBe(false);
    expect(
      isValidResolverEvent({
        ...base,
        info: { ...base.info, variables: null as unknown as Record<string, unknown> },
      })
    ).toBe(false);
  });
});

describe("normalizeEvent", () => {
  it("renames `arguments` to `args` and preserves identity, source, info and stash", () => {
    const event = mockResolverEvent({
      typeName: "Query",
      fieldName: "getUser",
      args: { id: "abc" },
      source: { parentId: "p1" },
      stash: { tracedId: "t1" },
    });

    const normalized = normalizeEvent(event);

    expect(normalized.args).toEqual({ id: "abc" });
    expect(normalized.identity).toEqual(cognitoIdentity);
    expect(normalized.source).toEqual({ parentId: "p1" });
    expect(normalized.stash).toEqual({ tracedId: "t1" });
    expect(normalized.info).toEqual({
      parentTypeName: "Query",
      fieldName: "getUser",
      variables: {},
      selectionSetList: ["id", "name"],
      selectionSetGraphQL: "{ id name }",
    });
  });

  it("defaults identity to null when missing", () => {
    const event = mockResolverEvent();
    delete (event as { identity?: unknown }).identity;

    const normalized = normalizeEvent(event);

    expect(normalized.identity).toBeNull();
  });

  it("defaults selectionSetList and selectionSetGraphQL to null when missing", () => {
    const event = mockResolverEvent();
    event.info.selectionSetList = undefined as unknown as string[];
    event.info.selectionSetGraphQL = undefined as unknown as string;

    const normalized = normalizeEvent(event);

    expect(normalized.info.selectionSetList).toBeNull();
    expect(normalized.info.selectionSetGraphQL).toBeNull();
  });
});
