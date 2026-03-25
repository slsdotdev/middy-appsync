import type { AppSyncResolverEvent, AppSyncResolverHandler, Context } from "aws-lambda";
import { AnyResolver } from "../resolvers/index.js";
import { createRouterRegistry } from "./registry.js";
import { isBatchResolver } from "../resolvers/createResolver.js";
import { isValidResolverEvent } from "../utils/event.js";

export interface GraphQLRouterParams {
  resolvers: AnyResolver[];
  fallbackResolver?: Extract<AnyResolver, { batch?: false }>["handler"];
}

export type AppSyncGraphQLHandler<
  TArgs = unknown,
  TSource extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = AppSyncResolverHandler<TArgs, TSource, TResult>;

export type AppSyncHandlerEvent<TArgs, TSource> =
  | AppSyncResolverEvent<TArgs, TSource>
  | AppSyncResolverEvent<TArgs, TSource>[];

export function appSyncGraphQLRouter(params: GraphQLRouterParams): AppSyncGraphQLHandler {
  const { resolvers, fallbackResolver = () => null } = params;
  const registry = createRouterRegistry();

  for (const resolver of resolvers) {
    registry.register(resolver);
  }

  return async function handler<TArgs, TSource>(
    event: AppSyncHandlerEvent<TArgs, TSource>,
    context: Context
  ) {
    if (Array.isArray(event)) {
      if (!event.length || event.some((e) => !isValidResolverEvent(e))) {
        throw new Error("Unknown resolver event format", {
          cause: { package: "@middy-appsync/graphql", event },
        });
      }

      const info = event[0].info;
      const resolver = registry.get(info.parentTypeName, info.fieldName);

      if (!resolver || !isBatchResolver(resolver)) {
        return event.map((ev) => fallbackResolver(ev, context));
      }

      return resolver.handler(event, context);
    }

    if (!isValidResolverEvent(event)) {
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
