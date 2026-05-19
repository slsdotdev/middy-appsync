import { Context } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { isBatchResolver } from "./createResolver.js";
import { resolver, FieldResolverEntry, mutation, object, query, subscription } from "./builders.js";
import { AnyResolverEvent, normalizeEvent } from "../utils/event.js";
import {
  cognitoIdentity,
  iamIdentity,
  mockBatchResolverEvent,
  mockResolverEvent,
} from "../../../internal/src/mocks/events.js";
import { isCognito } from "../utils/auth.js";
import { Unauthorized } from "../utils/errors.js";

const context = {} as Context;

describe("resolver", () => {
  it("returns a single-event resolver when given `resolve`", () => {
    const instance = resolver({
      typeName: "Query",
      fieldName: "getUser",
      resolve: () => null,
    });
    expect(instance.typeName).toBe("Query");
    expect(instance.fieldName).toBe("getUser");
    expect(isBatchResolver(instance)).toBe(false);
  });

  it("returns a batch resolver when given `batchResolve`", () => {
    const instance = resolver({
      typeName: "User",
      fieldName: "posts",
      batchResolve: (events) => events.map(() => null),
    });
    expect(isBatchResolver(instance)).toBe(true);
  });

  it("throws when both `resolve` and `batchResolve` are provided", () => {
    expect(() =>
      resolver({
        typeName: "Query",
        fieldName: "getUser",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve: (() => null) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        batchResolve: (() => []) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    ).toThrow(/either "resolve" or "batchResolve", not both/);
  });

  it("throws when neither `resolve` nor `batchResolve` is provided", () => {
    expect(() =>
      resolver({
        typeName: "Query",
        fieldName: "getUser",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    ).toThrow(/must define either "resolve" or "batchResolve"/);
  });
});

describe("query", () => {
  it("pins typeName to 'Query'", () => {
    const resolver = query({ getUser: () => null });
    expect(resolver[0].typeName).toBe("Query");
    expect(resolver[0].fieldName).toBe("getUser");
  });

  it("forwards batchResolve through createResolver", async () => {
    const resolver = query({
      listUsers: {
        batchResolve: (events) => events.map(() => ({ id: "1" })),
      },
    });

    expect(resolver[0].batch).toBe(true);
    expect(resolver[0].typeName).toBe("Query");
  });
});

describe("mutation", () => {
  it("pins typeName to 'Mutation'", () => {
    const resolver = mutation({ createUser: () => null });
    expect(resolver[0].typeName).toBe("Mutation");
    expect(resolver[0].fieldName).toBe("createUser");
  });
});

describe("subscription", () => {
  it("pins typeName to 'Subscription'", () => {
    const resolver = subscription({ onUserCreated: () => null });
    expect(resolver[0].typeName).toBe("Subscription");
    expect(resolver[0].fieldName).toBe("onUserCreated");
  });
});

describe("object", () => {
  it("returns an empty array for empty fields", () => {
    expect(object("User", {})).toEqual([]);
  });

  it("returns one resolver per declared field, with the right typeName/fieldName", () => {
    const resolvers = object("User", {
      displayName: () => "alice",
      email: () => "alice@example.com",
    });

    expect(resolvers).toHaveLength(2);
    expect(resolvers.map((r) => r.typeName)).toEqual(["User", "User"]);
    expect(resolvers.map((r) => r.fieldName).sort()).toEqual(["displayName", "email"]);
  });

  it("accepts a bare resolve function as a field entry", async () => {
    const [resolver] = object("User", {
      displayName: ({ source }) => `display:${(source as { name?: string }).name ?? "?"}`,
    });

    const event = normalizeEvent(
      mockResolverEvent({ typeName: "User", fieldName: "displayName", source: { name: "alice" } })
    );

    const result = await resolver.handler(event as AnyResolverEvent, context);
    expect(result).toBe("display:alice");
  });

  it("accepts a `{ resolve }` options object as a field entry", async () => {
    const [resolver] = object("User", {
      displayName: { resolve: () => "from-options" },
    });

    const event = normalizeEvent(mockResolverEvent({ typeName: "User", fieldName: "displayName" }));
    const result = await resolver.handler(event as AnyResolverEvent, context);

    expect(result).toBe("from-options");
  });

  it("supports batchResolve via options", async () => {
    const [resolver] = object("User", {
      posts: {
        batchResolve: (events) => events.map((e) => ({ source: e.args.id as string })),
      },
    });

    expect(isBatchResolver(resolver)).toBe(true);

    const events = mockBatchResolverEvent(2, { typeName: "User", fieldName: "posts" }).map(
      normalizeEvent
    );
    const results = await resolver.handler(events as AnyResolverEvent[], context);

    expect(results).toEqual([{ source: "user-1" }, { source: "user-2" }]);
  });

  it("enforces authorize when set via options", async () => {
    const [resolver] = object("User", {
      email: {
        authorize: isCognito,
        resolve: ({ source }) => (source as { email?: string }).email ?? null,
      },
    });

    const ok = normalizeEvent(
      mockResolverEvent({
        typeName: "User",
        fieldName: "email",
        source: { email: "a@b.c" },
        identity: cognitoIdentity,
      })
    );

    await expect(resolver.handler(ok, context)).resolves.toBe("a@b.c");

    const blocked = normalizeEvent(
      mockResolverEvent({
        typeName: "User",
        fieldName: "email",
        source: { email: "a@b.c" },
        identity: iamIdentity,
      })
    );
    await expect(resolver.handler(blocked, context)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("skips entries explicitly set to undefined", () => {
    const fields: Record<string, FieldResolverEntry<"User", string> | undefined> = {
      displayName: () => "x",
      hidden: undefined,
    };

    expect(object("User", fields)).toHaveLength(1);
  });
});

describe("query / mutation / subscription", () => {
  it("query() pins typeName to 'Query'", () => {
    const resolvers = query({
      getUser: () => null,
      listUsers: { resolve: () => [] },
    });

    expect(resolvers.map((r) => r.typeName)).toEqual(["Query", "Query"]);
    expect(resolvers.map((r) => r.fieldName).sort()).toEqual(["getUser", "listUsers"]);
  });

  it("mutation() pins typeName to 'Mutation'", () => {
    const resolvers = mutation({
      createUser: () => null,
    });

    expect(resolvers[0].typeName).toBe("Mutation");
    expect(resolvers[0].fieldName).toBe("createUser");
  });

  it("subscription() pins typeName to 'Subscription'", () => {
    const resolvers = subscription({
      onUserCreated: () => null,
    });

    expect(resolvers[0].typeName).toBe("Subscription");
    expect(resolvers[0].fieldName).toBe("onUserCreated");
  });

  it("query() accepts batchResolve", () => {
    const [resolver] = query({
      listUsers: { batchResolve: (events) => events.map(() => []) },
    });

    expect(isBatchResolver(resolver)).toBe(true);
  });

  it("query() throws when entry has both resolve and batchResolve", () => {
    expect(() =>
      query({
        listUsers: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resolve: (() => null) as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          batchResolve: (() => []) as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      })
    ).toThrow(/either "resolve" or "batchResolve", not both/);
  });

  it("query() throws when entry has neither resolve nor batchResolve", () => {
    expect(() =>
      query({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listUsers: {} as any,
      })
    ).toThrow(/must define either "resolve" or "batchResolve"/);
  });
});
