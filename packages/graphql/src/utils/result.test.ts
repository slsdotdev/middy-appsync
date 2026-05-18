import { describe, expect, it } from "vitest";
import { GraphQLError, Unauthorized } from "./errors.js";
import { formatResult } from "./result.js";

describe("formatResult", () => {
  it("wraps defined data in a `data` property", () => {
    expect(formatResult({ id: "1" })).toEqual({ data: { id: "1" } });
  });

  it("preserves null data", () => {
    expect(formatResult(null)).toEqual({ data: null });
  });

  it("omits data when undefined", () => {
    expect(formatResult(undefined)).toEqual({});
  });

  it("includes stash when provided", () => {
    expect(formatResult({ id: "1" }, null, { traceId: "t" })).toEqual({
      data: { id: "1" },
      stash: { traceId: "t" },
    });
  });

  it("omits empty undefined stash", () => {
    expect(formatResult("ok").stash).toBeUndefined();
  });

  it("uses the error's `name` as `type` when it is a GraphQLError", () => {
    const error = new GraphQLError("custom boom");

    expect(formatResult(undefined, error)).toEqual({
      error: { type: "GraphQLError", message: "custom boom" },
    });
  });

  it("uses the subclass name for GraphQLError subclasses", () => {
    const error = new Unauthorized();

    expect(formatResult(undefined, error)).toEqual({
      error: { type: "UnauthorizedException", message: "Unauthorized" },
    });
  });

  it("hides non-GraphQLError details behind a generic InternalServerError", () => {
    const error = new Error("sensitive details");

    expect(formatResult(undefined, error)).toEqual({
      error: { type: "InternalServerError", message: "An unexpected error occurred" },
    });
  });

  it("returns both data and error if both are provided", () => {
    const error = new GraphQLError("oops");
    const result = formatResult({ partial: true }, error);

    expect(result.data).toEqual({ partial: true });
    expect(result.error).toEqual({ type: "GraphQLError", message: "oops" });
  });

  it("treats falsy non-undefined errors as no error", () => {
    expect(formatResult({ id: "1" }, null).error).toBeUndefined();
    expect(formatResult({ id: "1" }, false).error).toBeUndefined();
    expect(formatResult({ id: "1" }, 0).error).toBeUndefined();
  });
});
