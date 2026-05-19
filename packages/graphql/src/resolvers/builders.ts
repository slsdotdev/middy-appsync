import type { Identity } from "../utils/auth.js";
import type {
  DefinitionTypename,
  FieldArgs,
  FieldResult,
  FieldSource,
  ObjectFieldName,
} from "../utils/definition.js";
import {
  type AnyResolver,
  type BatchResolveHandler,
  createResolver,
  type ResolveHandler,
  type Resolver,
} from "./createResolver.js";

interface BaseFieldParams<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TIdentity extends Identity,
> {
  /**
   * The name of the GraphQL type this resolver is for (e.g. `"Query"`,
   * `"Mutation"`, `"User"`).
   */
  typeName: TTypeName;
  /**
   * The name of the GraphQL field this resolver is for (e.g. `"getUser"`,
   * `"posts"`).
   */
  fieldName: TFieldName;
  /**
   * Identity predicate that gates this resolver. Attaches a `withAuthorization`
   * middleware that runs before any user-added middleware and throws
   * `Unauthorized` on failure. Also narrows `event.identity` to `TIdentity`
   * inside `resolve` / `batchResolve`.
   */
  authorize?: (identity: Identity) => identity is TIdentity;
}

/**
 * Parameters for a single-event {@link field} resolver. Provide a `resolve`
 * handler that receives one event and returns one result. `batchResolve` must
 * not be set.
 */
export interface SingleFieldParams<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
> extends BaseFieldParams<TTypeName, TFieldName, TIdentity> {
  resolve: ResolveHandler<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>;
  batchResolve?: never;
}

/**
 * Parameters for a batch {@link field} resolver. Provide a `batchResolve`
 * handler that receives an array of events and returns an array of results
 * (one per event, same order). `resolve` must not be set.
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-lambda-resolvers-js.html#advanced-use-case-batching-js
 */
export interface BatchFieldParams<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
> extends BaseFieldParams<TTypeName, TFieldName, TIdentity> {
  batchResolve: BatchResolveHandler<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>;
  resolve?: never;
}

/**
 * Parameters for {@link field}. Provide exactly one of `resolve` (single-event)
 * or `batchResolve` (batched).
 */
export type FieldParams<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
> =
  | SingleFieldParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>
  | BatchFieldParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>;

/**
 * Per-field entry accepted by the bulk builders ({@link object} / {@link query}
 * / {@link mutation} / {@link subscription}). Mirrors {@link FieldParams}
 * without the `typeName` / `fieldName` bookkeeping (the bulk builder fills
 * those in).
 *
 * Note: per-entry `authorize` does **not** narrow `identity` inside `resolve` —
 * mapped types can't carry a per-key generic. For per-field identity narrowing
 * reach for {@link field} or `createResolver`.
 */
export type FieldResolverOptions<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TIdentity extends Identity,
> =
  | Omit<
      SingleFieldParams<
        TTypeName,
        TFieldName,
        FieldSource<TTypeName, TFieldName>,
        FieldArgs<TTypeName, TFieldName>,
        FieldResult<TTypeName, TFieldName>,
        TIdentity
      >,
      "typeName" | "fieldName"
    >
  | Omit<
      BatchFieldParams<
        TTypeName,
        TFieldName,
        FieldSource<TTypeName, TFieldName>,
        FieldArgs<TTypeName, TFieldName>,
        FieldResult<TTypeName, TFieldName>,
        TIdentity
      >,
      "typeName" | "fieldName"
    >;

type BareResolveFn<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
> = ResolveHandler<
  TTypeName,
  TFieldName,
  FieldSource<TTypeName, TFieldName>,
  FieldArgs<TTypeName, TFieldName>,
  FieldResult<TTypeName, TFieldName>,
  Identity
>;

/**
 * A single entry in a bulk builder's `fields` argument: either a bare
 * single-event resolve function, or a {@link FieldResolverOptions} object
 * (single via `resolve`, or batch via `batchResolve`).
 */
export type FieldResolverEntry<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
> = BareResolveFn<TTypeName, TFieldName> | FieldResolverOptions<TTypeName, TFieldName, Identity>;

/**
 * Shape of the `fields` argument passed to {@link object} and friends. When
 * the package-level `Definition` is extended, keys are constrained to declared
 * field names for the given type; otherwise any string key is allowed.
 */
export type ObjectFieldsMap<TTypeName extends DefinitionTypename> = {
  [K in ObjectFieldName<TTypeName>]?: FieldResolverEntry<TTypeName, K>;
};

function toResolver<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TIdentity extends Identity,
>(
  typeName: TTypeName,
  fieldName: TFieldName,
  entry:
    | FieldResolverOptions<TTypeName, TFieldName, TIdentity>
    | BareResolveFn<TTypeName, TFieldName>
): AnyResolver {
  if (typeof entry === "function") {
    return createResolver({
      typeName,
      fieldName,
      resolve: entry,
    });
  }

  const hasResolve = typeof entry.resolve === "function";
  const hasBatchResolve = typeof entry.batchResolve === "function";

  if (hasResolve && hasBatchResolve) {
    throw new Error(
      `Resolver "${typeName}.${fieldName}" must define either "resolve" or "batchResolve", not both.`
    );
  }
  if (!hasResolve && !hasBatchResolve) {
    throw new Error(
      `Resolver "${typeName}.${fieldName}" must define either "resolve" or "batchResolve".`
    );
  }

  if (hasBatchResolve) {
    return createResolver({
      typeName,
      fieldName,
      batch: true,
      authorize: entry.authorize,
      resolve: entry.batchResolve,
    });
  }

  return createResolver({
    typeName,
    fieldName,
    authorize: entry.authorize,
    resolve: entry.resolve,
  });
}

function toResolvers<
  TTypeName extends DefinitionTypename,
  TFields extends ObjectFieldsMap<TTypeName>,
>(typeName: TTypeName, fields: TFields): AnyResolver[] {
  const resolvers: AnyResolver[] = [];

  for (const fieldName of Object.keys(fields)) {
    const entry = fields[fieldName];
    if (entry === undefined) continue;

    resolvers.push(toResolver(typeName, fieldName, entry));
  }

  return resolvers;
}

/**
 * Create a single GraphQL resolver for AWS AppSync. Provide exactly one of
 * `resolve` (single-event) or `batchResolve` (batched) — never both.
 *
 * @example Single-event resolver
 * ```ts
 * import { field } from "@middy-appsync/graphql";
 *
 * export const getUser = field({
 *   typeName: "Query",
 *   fieldName: "getUser",
 *   resolve: async ({ args }) => loadUser(args.id),
 * });
 * ```
 *
 * @example Batch resolver
 * ```ts
 * import { field, isCognito } from "@middy-appsync/graphql";
 *
 * export const userPosts = field({
 *   typeName: "User",
 *   fieldName: "posts",
 *   authorize: isCognito,
 *   batchResolve: async (events) =>
 *     Promise.all(events.map(({ source }) => loadPostsByUser(source.id))),
 * });
 * ```
 */
export function resolver<
  TTypeName extends DefinitionTypename = DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName> = ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName> = FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName> = FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName> = FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity = Identity,
>(
  params: SingleFieldParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>
): Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, undefined>;
export function resolver<
  TTypeName extends DefinitionTypename = DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName> = ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName> = FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName> = FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName> = FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity = Identity,
>(
  params: BatchFieldParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>
): Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, true>;
export function resolver<
  TTypeName extends DefinitionTypename = DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName> = ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName> = FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName> = FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName> = FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity = Identity,
>(params: FieldParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>): AnyResolver {
  const { typeName, fieldName, authorize, resolve, batchResolve } = params;

  return toResolver(typeName, fieldName, {
    authorize,
    resolve: resolve,
    batchResolve: batchResolve,
  } as FieldResolverOptions<TTypeName, TFieldName, TIdentity>);
}

/**
 * Define resolvers for one or more fields of a GraphQL object type. Each value
 * is either a bare resolve function or a {@link FieldResolverOptions} object
 * (single via `resolve`, or batch via `batchResolve`).
 *
 * Returns an array of resolvers ready to pass to `defineResolvers` or
 * `appSyncGraphQLRouter`.
 *
 * @example
 * ```ts
 * import { object, isCognito } from "@middy-appsync/graphql";
 *
 * export const userResolvers = object("User", {
 *   // bare resolve function
 *   displayName: ({ source }) => source.name.toUpperCase(),
 *
 *   // batch resolver via batchResolve
 *   posts: {
 *     batchResolve: async (events) =>
 *       Promise.all(events.map(({ source }) => loadPosts(source.id))),
 *   },
 *
 *   // authorize via options (runs before user middleware; throws Unauthorized on failure)
 *   email: {
 *     authorize: isCognito,
 *     resolve: ({ source }) => source.email,
 *   },
 * });
 * ```
 */
export function object<
  TTypeName extends DefinitionTypename,
  TFields extends ObjectFieldsMap<TTypeName>,
>(typeName: TTypeName, fields: TFields): AnyResolver[] {
  return toResolvers(typeName, fields);
}

/**
 * Bulk builder for `Query` fields. Equivalent to `object("Query", fields)`.
 *
 * @example
 * ```ts
 * import { query, isCognito } from "@middy-appsync/graphql";
 *
 * export const userQueries = query({
 *   getUser: async ({ args }) => loadUser(args.id),
 *   listUsers: { authorize: isCognito, resolve: async () => listAllUsers() },
 * });
 * ```
 */
export function query<TFields extends ObjectFieldsMap<"Query">>(fields: TFields): AnyResolver[] {
  return toResolvers("Query", fields);
}

/**
 * Bulk builder for `Mutation` fields. Equivalent to `object("Mutation", fields)`.
 *
 * @example
 * ```ts
 * import { mutation } from "@middy-appsync/graphql";
 *
 * export const userMutations = mutation({
 *   createUser: async ({ args }) => createUserRecord(args.input),
 *   deleteUser: async ({ args }) => deleteUserRecord(args.id),
 * });
 * ```
 */
export function mutation<TFields extends ObjectFieldsMap<"Mutation">>(
  fields: TFields
): AnyResolver[] {
  return toResolvers("Mutation", fields);
}

/**
 * Bulk builder for `Subscription` fields. Equivalent to
 * `object("Subscription", fields)`.
 *
 * @example
 * ```ts
 * import { subscription } from "@middy-appsync/graphql";
 *
 * export const userSubscriptions = subscription({
 *   onUserCreated: () => null,
 * });
 * ```
 */
export function subscription<TFields extends ObjectFieldsMap<"Subscription">>(
  fields: TFields
): AnyResolver[] {
  return toResolvers("Subscription", fields);
}
