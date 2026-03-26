import type { Context, Handler } from "aws-lambda";
import { AnyResolver } from "../resolvers/index.js";
import { createRouterRegistry } from "./registry.js";
import { isBatchResolver } from "../resolvers/createResolver.js";
import {
  AnyAppSyncResolverLikeEvent,
  isValidResolverEvent,
  normalizeEvent,
} from "../utils/event.js";

export interface GraphQLRouterParams {
  resolvers: AnyResolver[];
  fallbackResolver?: Extract<AnyResolver, { batch?: false }>["handler"];
}

export type AppSyncGraphQLResolverHandler = Handler<
  AnyAppSyncResolverLikeEvent,
  Record<string, unknown>
>;

export function appSyncGraphQLRouter(params: GraphQLRouterParams): AppSyncGraphQLResolverHandler {
  const { resolvers, fallbackResolver = () => null } = params;
  const registry = createRouterRegistry();

  for (const resolver of resolvers) {
    registry.register(resolver);
  }

  return async function handler(event: AnyAppSyncResolverLikeEvent, context: Context) {
    if (Array.isArray(event)) {
      if (!event.length || event.some((e) => !isValidResolverEvent(e))) {
        throw new Error("Unknown resolver event format", {
          cause: { package: "@middy-appsync/graphql", event },
        });
      }

      const info = event[0].info;
      const resolver = registry.get(info.parentTypeName, info.fieldName);

      if (!resolver || !isBatchResolver(resolver)) {
        return event.map((ev) => fallbackResolver(normalizeEvent(ev), context));
      }

      return resolver.handler(event.map(normalizeEvent), context);
    }

    if (!isValidResolverEvent(event)) {
      throw new Error("Unknown resolver event format", {
        cause: { package: "@middy-appsync/graphql", event },
      });
    }

    const info = event.info;
    const resolver = registry.get(info.parentTypeName, info.fieldName);

    if (!resolver || isBatchResolver(resolver)) {
      return fallbackResolver(normalizeEvent(event), context);
    }

    return resolver.handler(normalizeEvent(event), context);
  };
}
