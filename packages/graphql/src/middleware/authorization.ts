import { MiddlewareObj } from "@middy/core";
import {
  AnyAppSyncResolverLikeEvent,
  isCognito,
  isIAM,
  isLambda,
  isOIDC,
  isValidResolverEvent,
} from "../utils/index.js";

export function allowCognitoIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return {
    before(request) {
      if (Array.isArray(request.event)) {
        if (!request.event.every((e) => isValidResolverEvent(e) && isCognito(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isCognito(request.event.identity)) {
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
        if (!request.event.every((e) => isValidResolverEvent(e) && isIAM(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isIAM(request.event.identity)) {
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
        if (!request.event.every((e) => isValidResolverEvent(e) && isLambda(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isLambda(request.event.identity)) {
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
        if (!request.event.every((e) => isValidResolverEvent(e) && isOIDC(e.identity))) {
          throw new Error("Unauthorized");
        }
      } else {
        if (!isValidResolverEvent(request.event) || !isOIDC(request.event.identity)) {
          throw new Error("Unauthorized");
        }
      }
    },
  };
}
