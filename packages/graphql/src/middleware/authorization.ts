import type {
  AppSyncIdentityCognito,
  AppSyncIdentityIAM,
  AppSyncIdentityLambda,
  AppSyncIdentityOIDC,
} from "aws-lambda";
import { MiddlewareObj } from "@middy/core";
import type { Identity } from "../utils/auth.js";
import { isCognito, isIAM, isLambda, isOIDC } from "../utils/auth.js";
import {
  AnyAppSyncResolverLikeEvent,
  isValidResolverEvent,
  Unauthorized,
} from "../utils/index.js";

/**
 * Generic authorization middleware: throws {@link Unauthorized} when `authorize`
 * returns `false` for the incoming event (or for any entry in a batch event).
 *
 * The `authorize` predicate is a type guard, so when this middleware is attached
 * the resolver can rely on the narrowed identity type.
 */
export function withAuthorization<
  TIdentity extends Identity,
  TEvent extends AnyAppSyncResolverLikeEvent = AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(
  authorize: (identity: Identity) => identity is TIdentity
): MiddlewareObj<TEvent, TResult, Error> {
  const isAuthorized = (event: unknown): boolean =>
    isValidResolverEvent(event) && authorize(event.identity as Identity);

  return {
    before(request) {
      if (Array.isArray(request.event)) {
        if (!request.event.every(isAuthorized)) {
          throw new Unauthorized();
        }
        return;
      }

      if (!isAuthorized(request.event)) {
        throw new Unauthorized();
      }
    },
  };
}

export function allowCognitoIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return withAuthorization<AppSyncIdentityCognito, TEvent, TResult>(isCognito);
}

export function allowIAMIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return withAuthorization<AppSyncIdentityIAM, TEvent, TResult>(isIAM);
}

export function allowLambdaIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return withAuthorization<AppSyncIdentityLambda, TEvent, TResult>(isLambda);
}

export function allowOIDCIdentity<
  TEvent extends AnyAppSyncResolverLikeEvent,
  TResult = unknown,
>(): MiddlewareObj<TEvent, TResult, Error> {
  return withAuthorization<AppSyncIdentityOIDC, TEvent, TResult>(isOIDC);
}
