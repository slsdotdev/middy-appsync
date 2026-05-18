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
} from "./authorization.js";
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
