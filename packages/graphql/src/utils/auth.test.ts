import { describe, expect, it } from "vitest";
import {
  cognitoIdentity,
  iamIdentity,
  lambdaIdentity,
  oidcIdentity,
} from "@middy-appsync/internal/mocks";
import { isCognito, isIAM, isLambda, isOIDC, rule } from "./auth.js";

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
