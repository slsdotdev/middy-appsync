import type { Context } from "aws-lambda";
import { mockBatchResolverEvent, mockResolverEvent } from "@middy-appsync/internal/mocks";
import { createResolver } from "../resolvers/createResolver.js";
import { GraphQLError } from "../utils/errors.js";
import { appSyncGraphQLRouter } from "./router.js";
import { describe, expect, it, vi } from "vitest";

const context = {} as Context;

describe("appSyncGraphQLRouter — single event", () => {
  it("dispatches to the matching non-batch resolver and wraps the result via formatResult", async () => {
    const getUser = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: ({ args }) => ({ id: args.id as string, name: "Alice" }),
    });

    const handler = appSyncGraphQLRouter({ resolvers: [getUser] });
    const event = mockResolverEvent({
      typeName: "Query",
      fieldName: "getUser",
      args: { id: "u-1" },
      stash: { traceId: "t-1" },
    });

    const result = await handler(event, context, () => undefined);

    expect(result).toEqual({
      data: { id: "u-1", name: "Alice" },
      stash: { traceId: "t-1" },
    });
  });

  it("normalizes `arguments` to `args` for the resolver", async () => {
    let observedArgs: Record<string, unknown> | undefined;
    const getUser = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: (event) => {
        observedArgs = event.args;
        // `arguments` is intentionally not present on the normalized event
        expect("arguments" in event).toBe(false);
        return null;
      },
    });

    const handler = appSyncGraphQLRouter({ resolvers: [getUser] });
    await handler(
      mockResolverEvent({ typeName: "Query", fieldName: "getUser", args: { id: "u-2" } }),
      context,
      () => undefined
    );

    expect(observedArgs).toEqual({ id: "u-2" });
  });

  it("invokes the provided fallback when no resolver matches", async () => {
    const fallback = vi.fn(() => ({ fellBack: true }));
    const handler = appSyncGraphQLRouter({ resolvers: [], fallbackResolver: fallback });

    const event = mockResolverEvent({ typeName: "Query", fieldName: "missing" });
    const result = await handler(event, context, () => undefined);

    expect(fallback).toHaveBeenCalledOnce();
    expect(result).toEqual({ fellBack: true });
  });

  it("returns null when no resolver matches and no fallback is provided", async () => {
    const handler = appSyncGraphQLRouter({ resolvers: [] });

    const result = await handler(
      mockResolverEvent({ typeName: "Query", fieldName: "missing" }),
      context,
      () => undefined
    );

    expect(result).toBeNull();
  });

  it("falls back when a single event would match a batch resolver", async () => {
    const fallback = vi.fn(() => ({ fellBack: true }));
    const batchResolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      batch: true,
      resolve: () => [],
    });

    const handler = appSyncGraphQLRouter({
      resolvers: [batchResolver],
      fallbackResolver: fallback,
    });

    const result = await handler(
      mockResolverEvent({ typeName: "Query", fieldName: "getUser" }),
      context,
      () => undefined
    );

    expect(fallback).toHaveBeenCalledOnce();
    expect(result).toEqual({ fellBack: true });
  });

  it("formats GraphQLError thrown by the resolver into the error result", async () => {
    const failing = createResolver({
      typeName: "Query",
      fieldName: "fail",
      resolve: (): null => {
        throw new GraphQLError("nope");
      },
    });

    const handler = appSyncGraphQLRouter({ resolvers: [failing] });
    const result = await handler(
      mockResolverEvent({ typeName: "Query", fieldName: "fail" }),
      context,
      () => undefined
    );

    expect(result).toEqual({
      data: null,
      error: { type: "GraphQLError", message: "nope" },
    });
  });

  it("masks non-GraphQLError errors as InternalServerError", async () => {
    const failing = createResolver({
      typeName: "Query",
      fieldName: "fail",
      resolve: (): null => {
        throw new Error("leaky details");
      },
    });

    const handler = appSyncGraphQLRouter({ resolvers: [failing] });
    const result = await handler(
      mockResolverEvent({ typeName: "Query", fieldName: "fail" }),
      context,
      () => undefined
    );

    expect(result).toEqual({
      data: null,
      error: { type: "InternalServerError", message: "An unexpected error occurred" },
    });
  });

  it("returns InternalServerError when the event shape is invalid", async () => {
    const handler = appSyncGraphQLRouter({ resolvers: [] });
    const result = await handler({ not: "a real event" } as never, context, () => undefined);

    expect(result).toEqual({
      data: null,
      error: { type: "InternalServerError", message: "An unexpected error occurred" },
    });
  });
});

describe("appSyncGraphQLRouter — batch event", () => {
  it("dispatches the whole array to a matching batch resolver", async () => {
    const userPosts = createResolver({
      typeName: "User",
      fieldName: "posts",
      batch: true,
      resolve: (events) => events.map((e, i) => ({ source: e.args.id, idx: i })),
    });

    const handler = appSyncGraphQLRouter({ resolvers: [userPosts] });
    const events = mockBatchResolverEvent(2, { typeName: "User", fieldName: "posts" });
    const result = await handler(events, context, () => undefined);

    expect(result).toEqual([
      { data: { source: "user-1", idx: 0 }, stash: { index: 0 } },
      { data: { source: "user-2", idx: 1 }, stash: { index: 1 } },
    ]);
  });

  it("falls back per-event when a batch event matches a non-batch resolver", async () => {
    const fallback = vi.fn((event) => ({ fellBack: event.args.id as string }));
    const getUser = createResolver({
      typeName: "User",
      fieldName: "posts",
      resolve: () => null,
    });

    const handler = appSyncGraphQLRouter({
      resolvers: [getUser],
      fallbackResolver: fallback,
    });

    const events = mockBatchResolverEvent(2, { typeName: "User", fieldName: "posts" });
    const result = await handler(events, context, () => undefined);

    expect(fallback).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ fellBack: "user-1" }, { fellBack: "user-2" }]);
  });

  it("falls back per-event when there is no registered resolver", async () => {
    const fallback = vi.fn(() => ({ fellBack: true }));
    const handler = appSyncGraphQLRouter({ resolvers: [], fallbackResolver: fallback });

    const events = mockBatchResolverEvent(3, { typeName: "User", fieldName: "missing" });
    const result = await handler(events, context, () => undefined);

    expect(fallback).toHaveBeenCalledTimes(3);
    expect(result).toEqual([{ fellBack: true }, { fellBack: true }, { fellBack: true }]);
  });

  it("broadcasts a non-array batch result across all events", async () => {
    const userPosts = createResolver({
      typeName: "User",
      fieldName: "posts",
      batch: true,
      // intentionally return a non-array — covers the defensive branch in the router
      resolve: (() => "single-value") as never,
    });

    const handler = appSyncGraphQLRouter({ resolvers: [userPosts] });
    const events = mockBatchResolverEvent(2, { typeName: "User", fieldName: "posts" });
    const result = await handler(events, context, () => undefined);

    expect(result).toEqual([
      { data: "single-value", stash: { index: 0 } },
      { data: "single-value", stash: { index: 1 } },
    ]);
  });

  it("returns InternalServerError when the batch is empty", async () => {
    const handler = appSyncGraphQLRouter({ resolvers: [] });
    const result = await handler([], context, () => undefined);

    expect(result).toEqual({
      data: null,
      error: { type: "InternalServerError", message: "An unexpected error occurred" },
    });
  });

  it("returns InternalServerError when any batch entry is malformed", async () => {
    const handler = appSyncGraphQLRouter({ resolvers: [] });
    const events = [
      mockResolverEvent({ typeName: "User", fieldName: "posts" }),
      { not: "valid" } as never,
    ];

    const result = await handler(events, context, () => undefined);

    expect(result).toEqual({
      data: null,
      error: { type: "InternalServerError", message: "An unexpected error occurred" },
    });
  });
});
