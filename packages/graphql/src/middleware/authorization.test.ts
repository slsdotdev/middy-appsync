import type { Request } from "@middy/core";
import {
  mockBatchResolverEvent,
  mockResolverEvent,
  cognitoIdentity,
  iamIdentity,
  lambdaIdentity,
  oidcIdentity,
} from "@middy-appsync/internal/mocks";
import { Unauthorized } from "../utils/errors.js";
import {
  allowCognitoIdentity,
  allowIAMIdentity,
  allowLambdaIdentity,
  allowOIDCIdentity,
  withAuthorization,
} from "./authorization.js";
import { isCognito } from "../utils/auth.js";
import { describe, expect, it } from "vitest";

const makeRequest = <T>(event: T): Request<T, unknown, Error> =>
  ({
    event,
    context: {},
    response: null,
    error: null,
    internal: {},
  }) as unknown as Request<T, unknown, Error>;

const runBefore = async <T>(
  middleware: { before?: (request: Request<T, unknown, Error>) => unknown },
  event: T
) => {
  await middleware.before?.(makeRequest(event));
};

interface AuthCase {
  name: string;
  factory: () =>
    | ReturnType<typeof allowCognitoIdentity>
    | ReturnType<typeof allowIAMIdentity>
    | ReturnType<typeof allowLambdaIdentity>
    | ReturnType<typeof allowOIDCIdentity>;
  matchingIdentity:
    | typeof cognitoIdentity
    | typeof iamIdentity
    | typeof lambdaIdentity
    | typeof oidcIdentity;
  otherIdentities: (
    | typeof cognitoIdentity
    | typeof iamIdentity
    | typeof lambdaIdentity
    | typeof oidcIdentity
  )[];
}

const cases: AuthCase[] = [
  {
    name: "allowCognitoIdentity",
    factory: () => allowCognitoIdentity(),
    matchingIdentity: cognitoIdentity,
    otherIdentities: [iamIdentity, lambdaIdentity, oidcIdentity],
  },
  {
    name: "allowIAMIdentity",
    factory: () => allowIAMIdentity(),
    matchingIdentity: iamIdentity,
    otherIdentities: [cognitoIdentity, lambdaIdentity, oidcIdentity],
  },
  {
    name: "allowLambdaIdentity",
    factory: () => allowLambdaIdentity(),
    matchingIdentity: lambdaIdentity,
    otherIdentities: [cognitoIdentity, iamIdentity, oidcIdentity],
  },
  {
    name: "allowOIDCIdentity",
    factory: () => allowOIDCIdentity(),
    matchingIdentity: oidcIdentity,
    // Cognito extends OIDC so it should pass allowOIDCIdentity. IAM/Lambda should fail.
    otherIdentities: [iamIdentity, lambdaIdentity],
  },
];

describe.each(cases)("$name", ({ factory, matchingIdentity, otherIdentities }) => {
  it("passes through when a single event has the matching identity", async () => {
    const middleware = factory();
    const event = mockResolverEvent({ identity: matchingIdentity });

    await expect(runBefore(middleware, event)).resolves.toBeUndefined();
  });

  it("passes through when every event in a batch has the matching identity", async () => {
    const middleware = factory();
    const events = mockBatchResolverEvent(3, { identity: matchingIdentity });

    await expect(runBefore(middleware, events)).resolves.toBeUndefined();
  });

  it.each(otherIdentities)(
    "throws Unauthorized when a single event has a non-matching identity",
    async (identity) => {
      const middleware = factory();
      const event = mockResolverEvent({ identity });

      await expect(runBefore(middleware, event)).rejects.toBeInstanceOf(Unauthorized);
    }
  );

  it("throws Unauthorized when any batch entry has a non-matching identity", async () => {
    const middleware = factory();
    const events = [
      mockResolverEvent({ identity: matchingIdentity }),
      mockResolverEvent({ identity: otherIdentities[0] }),
    ];

    await expect(runBefore(middleware, events)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("throws Unauthorized for malformed events", async () => {
    const middleware = factory();
    await expect(runBefore(middleware, { not: "an event" } as never)).rejects.toBeInstanceOf(
      Unauthorized
    );
  });
});

describe("allowOIDCIdentity (Cognito compatibility)", () => {
  it("accepts a Cognito identity since Cognito extends OIDC", async () => {
    const middleware = allowOIDCIdentity();
    await expect(
      runBefore(middleware, mockResolverEvent({ identity: cognitoIdentity }))
    ).resolves.toBeUndefined();
  });
});

describe("withAuthorization", () => {
  it("passes through when the predicate returns true for a single event", async () => {
    const middleware = withAuthorization(isCognito);
    const event = mockResolverEvent({ identity: cognitoIdentity });

    await expect(runBefore(middleware, event)).resolves.toBeUndefined();
  });

  it("throws Unauthorized when the predicate returns false for a single event", async () => {
    const middleware = withAuthorization(isCognito);
    const event = mockResolverEvent({ identity: iamIdentity });

    await expect(runBefore(middleware, event)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("passes through when the predicate returns true for every batch entry", async () => {
    const middleware = withAuthorization(isCognito);
    const events = mockBatchResolverEvent(3, { identity: cognitoIdentity });

    await expect(runBefore(middleware, events)).resolves.toBeUndefined();
  });

  it("throws Unauthorized when any batch entry fails the predicate", async () => {
    const middleware = withAuthorization(isCognito);
    const events = [
      mockResolverEvent({ identity: cognitoIdentity }),
      mockResolverEvent({ identity: iamIdentity }),
    ];

    await expect(runBefore(middleware, events)).rejects.toBeInstanceOf(Unauthorized);
  });

  it("throws Unauthorized for a malformed event", async () => {
    const middleware = withAuthorization(isCognito);

    await expect(runBefore(middleware, { not: "an event" } as never)).rejects.toBeInstanceOf(
      Unauthorized
    );
  });

  it("supports custom predicates", async () => {
    const isAlice = (identity: unknown): identity is { username: "alice" } =>
      typeof identity === "object" &&
      identity !== null &&
      "username" in identity &&
      (identity as { username: unknown }).username === "alice";

    const middleware = withAuthorization(isAlice as never);

    await expect(
      runBefore(middleware, mockResolverEvent({ identity: cognitoIdentity }))
    ).resolves.toBeUndefined();
    await expect(
      runBefore(
        middleware,
        mockResolverEvent({ identity: { ...cognitoIdentity, username: "bob" } })
      )
    ).rejects.toBeInstanceOf(Unauthorized);
  });
});
