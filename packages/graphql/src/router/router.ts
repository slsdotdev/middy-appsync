import type {
  AppSyncResolverEvent,
  AppSyncResolverHandler,
  AppSyncBatchResolverHandler,
  Context,
} from "aws-lambda";
import { AnyResolver, ResolveHandler } from "../resolvers/index.js";
import { createRouterRegistry } from "./registry.js";
import { isValidGraphQLEvent } from "../utils/isValidGraphQLEvent.js";
import { isBatchResolver } from "../resolvers/createResolver.js";

export interface GraphQLRouterParams {
  resolvers: AnyResolver[];
  fallbackResolver?: ResolveHandler<unknown, unknown, unknown>;
}

export type AppSyncGraphQLHandler<TSource = unknown, TArgs = unknown, TResult = unknown> =
  | AppSyncResolverHandler<TArgs, TSource, TResult>
  | AppSyncBatchResolverHandler<TArgs, TSource, TResult>;

export type AppSyncHandlerEvent<TSource, TArgs> =
  | AppSyncResolverEvent<TArgs, TSource>
  | AppSyncResolverEvent<TArgs, TSource>[];

export function appSyncGraphQLRouter(params: GraphQLRouterParams): AppSyncGraphQLHandler {
  const { resolvers, fallbackResolver = () => null } = params;
  const registry = createRouterRegistry();

  for (const resolver of resolvers) {
    registry.register(resolver);
  }

  return async function handler<TSource, TArgs>(
    event: AppSyncHandlerEvent<TSource, TArgs>,
    context: Context
  ) {
    if (Array.isArray(event)) {
      if (!event.length || event.some((e) => !isValidGraphQLEvent(e))) {
        throw new Error("Unknown resolver event format", {
          cause: { package: "@middy-appsync/graphql", event },
        });
      }

      const info = event[0].info;
      const resolver = registry.get(info.parentTypeName, info.fieldName);

      if (!resolver || !isBatchResolver(resolver)) {
        return fallbackResolver(event[0], context);
      }

      return resolver.handler(event, context);
    }

    if (!isValidGraphQLEvent(event)) {
      throw new Error("Unknown resolver event format", {
        cause: { package: "@middy-appsync/graphql", event },
      });
    }

    const info = event.info;
    const resolver = registry.get(info.parentTypeName, info.fieldName);

    if (!resolver || isBatchResolver(resolver)) {
      return fallbackResolver(event, context);
    }

    return resolver.handler(event, context);
  };
}
