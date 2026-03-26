import type {
  AppSyncIdentity,
  AppSyncIdentityCognito,
  AppSyncIdentityIAM,
  AppSyncIdentityLambda,
  AppSyncIdentityOIDC,
} from "aws-lambda";
import { hasProperty, isDefined, isRecord, isString } from "./typeGuards.js";

export type AnyIdentity = AppSyncIdentity | Record<string, unknown>;

export function isOIDC(identity: AppSyncIdentity): identity is AppSyncIdentityOIDC {
  return (
    isDefined(identity) &&
    hasProperty(identity, "sub") &&
    isString(identity.sub) &&
    hasProperty(identity, "issuer") &&
    isString(identity.issuer) &&
    hasProperty(identity, "claims") &&
    isRecord(identity.claims)
  );
}

export function isCognito(identity: AppSyncIdentity): identity is AppSyncIdentityCognito {
  return (
    isOIDC(identity) &&
    hasProperty(identity, "username") &&
    isString(identity.username) &&
    hasProperty(identity, "groups") &&
    hasProperty(identity, "sourceIp") &&
    Array.isArray(identity.sourceIp) &&
    identity.sourceIp.every(isString)
  );
}

export function isIAM(identity: AppSyncIdentity): identity is AppSyncIdentityIAM {
  return (
    isDefined(identity) &&
    hasProperty(identity, "accountId") &&
    isString(identity.accountId) &&
    hasProperty(identity, "cognitoIdentityPoolId") &&
    isString(identity.cognitoIdentityPoolId) &&
    hasProperty(identity, "sourceIp") &&
    Array.isArray(identity.sourceIp) &&
    identity.sourceIp.every(isString) &&
    hasProperty(identity, "username") &&
    isString(identity.username)
  );
}

export function isLambda(identity: AppSyncIdentity): identity is AppSyncIdentityLambda {
  return (
    isDefined(identity) &&
    hasProperty(identity, "resolverContext") &&
    isRecord(identity.resolverContext)
  );
}
