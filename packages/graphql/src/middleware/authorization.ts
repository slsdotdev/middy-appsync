import { MiddlewareObj } from "@middy/core";
import {
  AnyAppSyncResolverLikeEvent,
  AnyIdentity,
  DefinitionTypename,
  FieldArgs,
  FieldResult,
  FieldSource,
  isCognito,
  isIAM,
  isLambda,
  isOIDC,
  isValidResolverEvent,
  ObjectFieldName,
} from "../utils/index.js";
import { ResolverEvent } from "../utils/event.js";
import { Context } from "aws-lambda";

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

export function withAuthorizer<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends AnyIdentity,
>(
  authorizer: (identity: AnyIdentity) => boolean | TIdentity
): MiddlewareObj<
  ResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>,
  TResult,
  Error,
  Context
> {
  return {
    before(request) {
      if (Array.isArray(request.event)) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < request.event.length; i++) {
          const result = authorizer(request.event[i].identity);

          if (typeof result === "boolean") {
            if (!result) throw new Error("Unauthorized");
            continue;
          }

          request.event[i].identity = result;
        }
      }

      const result = authorizer(request.event.identity);

      if (typeof result === "boolean") {
        if (!result) throw new Error("Unauthorized");
        return;
      }

      request.event.identity = result;
    },
  };
}
