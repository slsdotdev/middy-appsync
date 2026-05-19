import { describe, expect, it } from "vitest";
import type { Context } from "aws-lambda";
import {
  cognitoIdentity,
  iamIdentity,
  mockBatchResolverEvent,
  mockResolverEvent,
} from "@middy-appsync/internal/mocks";
import { isCognito } from "../utils/auth.js";
import { Unauthorized } from "../utils/errors.js";
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

describe("createResolver().authorize", () => {
  it("does not attach authorization middleware when authorize is omitted", async () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => ({ ok: true }),
    });

    const event = normalizeEvent(mockResolverEvent({ identity: iamIdentity }));
    await expect(resolver.handler(event as AnyResolverEvent, context)).resolves.toEqual({
      ok: true,
    });
  });

  it("invokes resolve when the predicate passes (single event)", async () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      authorize: isCognito,
      resolve: ({ identity }) => ({ user: identity.username }),
    });

    const event = normalizeEvent(mockResolverEvent({ identity: cognitoIdentity }));
    await expect(resolver.handler(event as never, context)).resolves.toEqual({
      user: "alice",
    });
  });

  it("throws Unauthorized when the predicate fails (single event)", async () => {
    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      authorize: isCognito,
      resolve: () => ({ shouldNot: "run" }),
    });

    const event = normalizeEvent(mockResolverEvent({ identity: iamIdentity }));
    await expect(resolver.handler(event as never, context)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("throws Unauthorized when any batch entry fails the predicate", async () => {
    const resolver = createResolver({
      typeName: "User",
      fieldName: "posts",
      batch: true,
      authorize: isCognito,
      resolve: (events) => events.map(() => null),
    });

    const events = [
      mockResolverEvent({ identity: cognitoIdentity }),
      mockResolverEvent({ identity: iamIdentity }),
    ].map(normalizeEvent);

    await expect(resolver.handler(events as never, context)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("runs authorize before user-added middleware", async () => {
    const order: string[] = [];

    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      authorize: (identity) => {
        order.push("authorize");
        return isCognito(identity);
      },
      resolve: () => {
        order.push("resolve");
        return null;
      },
    });

    resolver.use({
      before: () => {
        order.push("user-before");
      },
    });

    const event = normalizeEvent(mockResolverEvent({ identity: cognitoIdentity }));
    await resolver.handler(event as never, context);

    expect(order).toEqual(["authorize", "user-before", "resolve"]);
  });

  it("skips user-added middleware when authorize rejects", async () => {
    const order: string[] = [];

    const resolver = createResolver({
      typeName: "Query",
      fieldName: "getUser",
      authorize: isCognito,
      resolve: () => null,
    });

    resolver.use({
      before: () => {
        order.push("user-before");
      },
    });

    const event = normalizeEvent(mockResolverEvent({ identity: iamIdentity }));

    await expect(resolver.handler(event as never, context)).rejects.toBeInstanceOf(Unauthorized);
    expect(order).toEqual([]);
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
