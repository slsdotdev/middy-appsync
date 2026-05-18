import type { Context, Handler } from "aws-lambda";
import { AnyResolver } from "../resolvers/index.js";
import { createRouterRegistry } from "./registry.js";
import { isBatchResolver, ResolveHandler } from "../resolvers/createResolver.js";
import {
  AnyAppSyncResolverLikeEvent,
  isValidResolverEvent,
  normalizeEvent,
} from "../utils/event.js";
import { formatResult } from "../utils/result.js";

export interface GraphQLRouterParams {
  resolvers: AnyResolver[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackResolver?: ResolveHandler<any, any, any, any, any, any>;
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
    try {
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

        const results = await resolver.handler(event.map(normalizeEvent), context);

        if (!Array.isArray(results)) {
          return event.map((ev) => formatResult(results, null, ev.stash));
        }

        return results.map((result, i) => formatResult(result, null, event[i].stash));
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

      const result = await resolver.handler(normalizeEvent(event), context);
      return formatResult(result, null, event.stash);
    } catch (error) {
      return formatResult(null, error);
    }
  };
}
