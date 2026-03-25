import type {
  AppSyncIdentity,
  AppSyncIdentityCognito,
  AppSyncIdentityIAM,
  AppSyncIdentityLambda,
  AppSyncIdentityOIDC,
} from "aws-lambda";
import { MiddlewareObj } from "@middy/core";
import { AnyAppSyncResolverLikeEvent, isValidResolverEvent } from "../utils/index.js";
import { hasProperty, isDefined, isRecord, isString } from "../utils/typeGuards.js";

export function isOIDCIdentity(identity: AppSyncIdentity): identity is AppSyncIdentityOIDC {
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

export function isCognitoIdentity(identity: AppSyncIdentity): identity is AppSyncIdentityCognito {
  return (
    isOIDCIdentity(identity) &&
    hasProperty(identity, "username") &&
    isString(identity.username) &&
    hasProperty(identity, "groups") &&
    hasProperty(identity, "sourceIp") &&
    Array.isArray(identity.sourceIp) &&
    identity.sourceIp.every(isString)
  );
}

export function isIAMIdentity(identity: AppSyncIdentity): identity is AppSyncIdentityIAM {
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

export function isLambdaIdentity(identity: AppSyncIdentity): identity is AppSyncIdentityLambda {
  return (
    isDefined(identity) &&
    hasProperty(identity, "resolverContext") &&
    isRecord(identity.resolverContext)
  );
}

export function allowCognitoIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return {
    before(request) {
      if (Array.isArray(request.event)) {
        if (!request.event.every((e) => isValidResolverEvent(e) && isCognitoIdentity(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isCognitoIdentity(request.event.identity)) {
          throw new Error("Unauthorized");
        }
      }
    },
  };
}

export function allowIAMIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return {
    before(request) {
      if (Array.isArray(request.event)) {
        if (!request.event.every((e) => isValidResolverEvent(e) && isIAMIdentity(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isIAMIdentity(request.event.identity)) {
          throw new Error("Unauthorized");
        }
      }
    },
  };
}

export function allowLambdaIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return {
    before(request) {
      if (Array.isArray(request.event)) {
        if (!request.event.every((e) => isValidResolverEvent(e) && isLambdaIdentity(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isLambdaIdentity(request.event.identity)) {
          throw new Error("Unauthorized");
        }
      }
    },
  };
}

export function allowOIDCIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return {
    before(request) {
      if (Array.isArray(request.event)) {
        if (!request.event.every((e) => isValidResolverEvent(e) && isOIDCIdentity(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isOIDCIdentity(request.event.identity)) {
          throw new Error("Unauthorized");
        }
      }
    },
  };
}
