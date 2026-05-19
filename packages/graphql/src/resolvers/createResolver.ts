import type { Context } from "aws-lambda";
import middy, { MiddlewareObj, MiddyfiedHandler } from "@middy/core";
import { withAuthorization } from "../middleware/authorization.js";
import type { Identity } from "../utils/auth.js";
import type {
  DefinitionTypename,
  FieldArgs,
  FieldResult,
  FieldSource,
  ObjectFieldName,
} from "../utils/definition.js";
import type { ResolverEvent, TypedAppSyncResolverEvent } from "../utils/event.js";
import { hasProperty } from "../utils/typeGuards.js";

export type ResolveHandler<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
> = (
  event: TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>,
  context: Context
) => Promise<TResult> | TResult;

export type BatchResolveHandler<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
> = (
  events: TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>[],
  context: Context
) => Promise<TResult[]> | TResult[];

export interface Resolver<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
  TBatch extends true | undefined,
> {
  typeName: TTypeName;
  fieldName: TFieldName;
  batch?: TBatch;
  handler: MiddyfiedHandler<
    ResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity, TBatch>,
    TResult,
    Error,
    Context
  >;
  use(
    middleware: MiddlewareObj<
      ResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity, TBatch>,
      TResult,
      Error,
      Context
    >
  ): Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyResolver = Resolver<any, any, any, any, any, any, true | undefined>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBatchResolver = Resolver<any, any, any, any, any, any, true>;

export function isBatchResolver(resolver: AnyResolver): resolver is AnyBatchResolver {
  return hasProperty(resolver, "batch") && resolver.batch === true;
}

export interface ResolverParams<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity,
  TBatch extends true | undefined,
> {
  /**
   * The name of the GraphQL type this resolver is for (e.g. "Query", "Mutation", "User", etc.)
   */
  typeName: TTypeName;

  /**
   * The name of the GraphQL field this resolver is for (e.g. "getUser", "createUser", "name", etc.)
   */
  fieldName: TFieldName;

  /**
   * Whether this resolver is a batch resolver. Batch resolvers receive an array of events and should return an array of results. Defaults to `false`.
   * @see https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-lambda-resolvers-js.html#advanced-use-case-batching-js
   */
  batch?: TBatch;

  /**
   * Identity authorizer predicate that checks whether the incoming request is authorized to access this resolver. When provided, the resolver attaches a {@link withAuthorization} middleware that runs before any user-added `.use(...)` middleware. If the predicate returns `false` (for a single event or any entry of a batch event) the resolver throws an `Unauthorized` error.
   *
   * The predicate also narrows `event.identity` to `TIdentity` inside `resolve`.
   *
   * @example
   * ```ts
   * import { createResolver, isCognito } from "@middy-appsync/graphql";
   *
   * const resolver = createResolver({
   *   typeName: "Query",
   *   fieldName: "getUser",
   *   authorize: isCognito,
   *   resolve: (event) => {
   *     // event.identity is typed as AppSyncIdentityCognito here
   *     const username = event.identity.username;
   *     // ...
   *   },
   * });
   * ```
   */
  authorize?: (identity: Identity) => identity is TIdentity;

  /**
   * The resolver function that will be called when this resolver is invoked. If `batch` is `true`, this should be a batch resolver function that accepts an array of events and returns an array of results. Otherwise, it should be a regular resolver function that accepts a single event and returns a single result.
   * @param event The resolver event containing arguments, identity, source, etc.
   * @param context The AWS Lambda context object
   * @returns The result of the resolver function. If `batch` is `true`, this should be an array of results corresponding to the array of input events.
   */
  resolve: TBatch extends true
    ? BatchResolveHandler<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>
    : ResolveHandler<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>;
}

/**
 * Creates a GraphQL resolver for AWS AppSync.
 *
 * `createResolver` is the low-level factory — it accepts the polymorphic
 * `resolve` shape gated by the `batch` flag. For ergonomic call sites prefer
 * {@link field} / {@link object} / {@link query} / {@link mutation} /
 * {@link subscription}, which split into `resolve` vs `batchResolve` for
 * cleaner inference.
 *
 * @example
 * ```ts
 * import { createResolver } from "@middy-appsync/graphql";
 *
 * const getUser = createResolver({
 *   typeName: "Query",
 *   fieldName: "getUser",
 *   resolve: async (event) => {
 *     const { id } = event.args;
 *     // Fetch user by id and return
 *   },
 * });
 * ```
 */
export function createResolver<
  TTypeName extends DefinitionTypename = DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName> = ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName> = FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName> = FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName> = FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity = Identity,
  TBatch extends true | undefined = undefined,
>(
  params: ResolverParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>
): Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> {
  type Event = ResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity, TBatch>;

  const handler = middy<Event, TResult, Error, Context>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params.resolve as any
  );

  if (params.authorize) {
    handler.use(
      withAuthorization(params.authorize) as unknown as MiddlewareObj<
        Event,
        TResult,
        Error,
        Context
      >
    );
  }

  const resolver: Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> = {
    typeName: params.typeName,
    fieldName: params.fieldName,
    handler,
    batch: params.batch,
    use(middleware: MiddlewareObj<Event, TResult, Error, Context>) {
      handler.use(middleware);
      return resolver;
    },
  };

  return resolver;
}
