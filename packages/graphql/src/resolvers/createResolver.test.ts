import { describe, expect, it } from "vitest";
import type { Context } from "aws-lambda";
import { mockBatchResolverEvent, mockResolverEvent } from "@middy-appsync/internal/mocks";
import { AnyResolverEvent, normalizeEvent } from "../utils/event.js";
import { createResolver, isBatchResolver } from "./createResolver.js";

const context = {} as Context;

describe("createResolver", () => {
  it("returns a resolver with typeName, fieldName and a handler", () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => ({ id: "1" }),
    });

    expect(resolver.typeName).toBe("Query");
    expect(resolver.fieldName).toBe("getUser");
    expect(typeof resolver.handler).toBe("function");
  });

  it("invokes the resolve function with the provided event and returns its result", async () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: ({ args }) => ({ id: args.id as string, name: "Alice" }),
    });

    const event = normalizeEvent(mockResolverEvent({ args: { id: "u-1" } }));
    const result = await resolver.handler(event as AnyResolverEvent, context);

    expect(result).toEqual({ id: "u-1", name: "Alice" });
  });

  it("propagates errors thrown inside resolve", async () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => {
        throw new Error("boom");
      },
    });

    const event = normalizeEvent(mockResolverEvent());

    await expect(resolver.handler(event as AnyResolverEvent, context)).rejects.toThrow("boom");
  });

  it("defaults batch to undefined when not provided", () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => null,
    });

    expect(resolver.batch).toBeUndefined();
    expect(isBatchResolver(resolver)).toBe(false);
  });

  it("preserves batch: false as non-batch", () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      batch: false,
      resolve: () => null,
    });

    expect(resolver.batch).toBe(false);
    expect(isBatchResolver(resolver)).toBe(false);
  });

  it("supports batch: true with an array handler", async () => {
    const resolver = createResolver({
      typeName: "User",
      fieldName: "posts",
      batch: true,
      resolve: (events) => events.map((e) => ({ id: e.args.id as string })),
    });

    expect(resolver.batch).toBe(true);
    expect(isBatchResolver(resolver)).toBe(true);

    const events = mockBatchResolverEvent(3, { typeName: "User", fieldName: "posts" }).map(
      normalizeEvent
    );
    const results = await resolver.handler(events as AnyResolverEvent[], context);

    expect(results).toEqual([{ id: "user-1" }, { id: "user-2" }, { id: "user-3" }]);
  });
});

describe("createResolver().use", () => {
  it("attaches middleware that observes events before resolve runs", async () => {
    const seen: string[] = [];
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: ({ args }) => {
        seen.push(`resolve:${args.id as string}`);
        return { id: args.id as string };
      },
    });

    resolver.use({
      before: (request) => {
        const event = request.event;
        const id = Array.isArray(event) ? event[0].args.id : event.args.id;
        seen.push(`before:${id as string}`);
      },
    });

    const event = normalizeEvent(mockResolverEvent({ args: { id: "u-9" } }));
    await resolver.handler(event as AnyResolverEvent, context);

    expect(seen).toEqual(["before:u-9", "resolve:u-9"]);
  });

  it("returns the resolver for chaining", () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => null,
    });

    const chained = resolver.use({ before: () => undefined }).use({ after: () => undefined });

    expect(chained).toBe(resolver);
  });

  it("middleware can short-circuit the resolver by setting response", async () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => ({ id: "from-resolve" }),
    });

    resolver.use({
      before: (request) => {
        request.response = { id: "from-middleware" };
        return request.response;
      },
    });

    const event = normalizeEvent(mockResolverEvent());
    const result = await resolver.handler(event as AnyResolverEvent, context);

    expect(result).toEqual({ id: "from-middleware" });
  });
});

describe("isBatchResolver", () => {
  it("returns true only for batch: true resolvers", () => {
    const single = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => null,
    });
    const batch = createResolver({
      typeName: "User",
      fieldName: "posts",
      batch: true,
      resolve: () => [],
    });

    expect(isBatchResolver(single)).toBe(false);
    expect(isBatchResolver(batch)).toBe(true);
  });
});
