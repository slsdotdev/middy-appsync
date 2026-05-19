import { describe, expect, it } from "vitest";
import type { AppSyncIdentity } from "aws-lambda";
import {
  cognitoIdentity,
  iamIdentity,
  lambdaIdentity,
  oidcIdentity,
} from "@middy-appsync/internal/mocks";
import { and, isCognito, isIAM, isLambda, isOIDC, or, rule } from "./auth.js";

describe("isOIDC", () => {
  it("accepts OIDC identities (and Cognito which extends OIDC)", () => {
    expect(isOIDC(oidcIdentity)).toBe(true);
    expect(isOIDC(cognitoIdentity)).toBe(true);
  });

  it("rejects IAM, Lambda, null and undefined", () => {
    expect(isOIDC(iamIdentity)).toBe(false);
    expect(isOIDC(lambdaIdentity)).toBe(false);
    expect(isOIDC(null)).toBe(false);
    expect(isOIDC(undefined)).toBe(false);
  });
});

describe("isCognito", () => {
  it("accepts Cognito identities only", () => {
    expect(isCognito(cognitoIdentity)).toBe(true);
  });

  it("rejects plain OIDC, IAM, Lambda", () => {
    expect(isCognito(oidcIdentity)).toBe(false);
    expect(isCognito(iamIdentity)).toBe(false);
    expect(isCognito(lambdaIdentity)).toBe(false);
    expect(isCognito(null)).toBe(false);
    expect(isCognito(undefined)).toBe(false);
  });
});

describe("isIAM", () => {
  it("accepts IAM identities only", () => {
    expect(isIAM(iamIdentity)).toBe(true);
  });

  it("rejects Cognito, OIDC, Lambda", () => {
    expect(isIAM(cognitoIdentity)).toBe(false);
    expect(isIAM(oidcIdentity)).toBe(false);
    expect(isIAM(lambdaIdentity)).toBe(false);
    expect(isIAM(null)).toBe(false);
    expect(isIAM(undefined)).toBe(false);
  });
});

describe("isLambda", () => {
  it("accepts Lambda identities only", () => {
    expect(isLambda(lambdaIdentity)).toBe(true);
  });

  it("rejects Cognito, OIDC, IAM", () => {
    expect(isLambda(cognitoIdentity)).toBe(false);
    expect(isLambda(oidcIdentity)).toBe(false);
    expect(isLambda(iamIdentity)).toBe(false);
    expect(isLambda(null)).toBe(false);
    expect(isLambda(undefined)).toBe(false);
  });
});

describe("rule", () => {
  it("returns the predicate unchanged (pass-through helper)", () => {
    const predicate = isCognito;
    expect(rule(predicate)).toBe(predicate);
  });
});

describe("and", () => {
  it("returns true only when every rule passes", () => {
    const isAdmin = rule(
      (identity: AppSyncIdentity): identity is AppSyncIdentity =>
        isCognito(identity) && (identity.groups?.includes("admin") ?? false)
    );

    const isCognitoAdmin = and(isCognito, isAdmin);

    expect(isCognitoAdmin(cognitoIdentity)).toBe(true);
    expect(isCognitoAdmin({ ...cognitoIdentity, groups: ["viewer"] })).toBe(false);
    expect(isCognitoAdmin(iamIdentity)).toBe(false);
  });

  it("short-circuits on the first failing rule", () => {
    let secondCalled = false;
    const failFast = (() => false) as never;
    const trackingRule = (() => {
      secondCalled = true;
      return true;
    }) as never;

    const combined = and(failFast, trackingRule);
    combined(cognitoIdentity);

    expect(secondCalled).toBe(false);
  });

  it("returns true for the empty composition (vacuous truth)", () => {
    expect(and()(cognitoIdentity)).toBe(true);
    expect(and()(null)).toBe(true);
  });

  it("nests with or", () => {
    const isCognitoOrIAM = or(isCognito, isIAM);
    const isLoggedInAndAuthorized = and(isCognitoOrIAM, isCognitoOrIAM);

    expect(isLoggedInAndAuthorized(cognitoIdentity)).toBe(true);
    expect(isLoggedInAndAuthorized(iamIdentity)).toBe(true);
    expect(isLoggedInAndAuthorized(lambdaIdentity)).toBe(false);
  });
});

describe("or", () => {
  it("returns true when any rule passes", () => {
    const isCognitoOrIAM = or(isCognito, isIAM);

    expect(isCognitoOrIAM(cognitoIdentity)).toBe(true);
    expect(isCognitoOrIAM(iamIdentity)).toBe(true);
    expect(isCognitoOrIAM(lambdaIdentity)).toBe(false);
    expect(isCognitoOrIAM(oidcIdentity)).toBe(false);
  });

  it("short-circuits on the first passing rule", () => {
    let secondCalled = false;
    const passFast = (() => true) as never;
    const trackingRule = (() => {
      secondCalled = true;
      return false;
    }) as never;

    const combined = or(passFast, trackingRule);
    combined(cognitoIdentity);

    expect(secondCalled).toBe(false);
  });

  it("returns false for the empty composition", () => {
    expect(or()(cognitoIdentity)).toBe(false);
    expect(or()(null)).toBe(false);
  });
});
