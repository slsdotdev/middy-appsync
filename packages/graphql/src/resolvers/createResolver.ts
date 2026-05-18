import type { Context } from "aws-lambda";
import middy, { MiddlewareObj, MiddyfiedHandler } from "@middy/core";
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
  TBatch extends boolean | undefined,
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

export type AnyResolver =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Resolver<any, any, any, any, any, any, boolean | undefined>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Resolver<any, any, any, any, any, any, true>;

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
  TBatch extends boolean | undefined,
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

  // /**
  //  * Identity authorizer function that checks if the incoming request is authorized to access this resolver.
  //  * @param identity
  //  * @returns Predicates that narrow the type of `identity` to a specific identity type (e.g. Cognito, OIDC, IAM, Lambda, etc.) if the check passes. If the check fails, the resolver will return an unauthorized error.
  //  * @example
  //  * ```ts
  //  * import { isCognito } from "@middy-appsync/graphql";
  //  *
  //  * const resolver = createResolver({
  //  *   typeName: "Query",
  //  *   fieldName: "getUser",
  //  *   authorize: isCognito,
  //  *   resolve: (event) => {
  //  *     // At this point, TypeScript knows that event.identity is of type IdentityCognito
  //  *     const username = event.identity.username;
  //  *     // Fetch user by username and return
  //  *   },
  //  * });
  //  * ```
  //  */
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
 * @example
 * ```ts
 * import { createResolver } from "@middy-appsync/graphql";
 *
 * const getUser = createResolver({
 *   typeName: "Query",
 *   fieldName: "getUser",
 *   resolve: async (event) => {
 *     const { id } = event.arguments;
 *     // Fetch user by id and return
 *   },
 * });
 * ```
 *
 * @param params - Reolver params
 * @returns
 */

export function createResolver<
  TTypeName extends DefinitionTypename = DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName> = ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName> = FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName> = FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName> = FieldResult<TTypeName, TFieldName>,
  TIdentity extends Identity = Identity,
  TBatch extends boolean | undefined = undefined,
>(
  params: ResolverParams<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>
): Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> {
  const handler = middy<
    ResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity, TBatch>,
    TResult,
    Error,
    Context
  >(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params.resolve as any
  );

  const resolver: Resolver<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> = {
    typeName: params.typeName,
    fieldName: params.fieldName,
    handler,
    batch: params.batch,
    use(
      middleware: MiddlewareObj<
        ResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity, TBatch>,
        TResult,
        Error,
        Context
      >
    ) {
      handler.use(middleware);
      return resolver;
    },
  };

  return resolver;
}

export function createQueryResolver<
  TFieldName extends ObjectFieldName<"Query"> = ObjectFieldName<"Query">,
  TSource extends FieldSource<"Query", TFieldName> = FieldSource<"Query", TFieldName>,
  TArgs extends FieldArgs<"Query", TFieldName> = FieldArgs<"Query", TFieldName>,
  TResult extends FieldResult<"Query", TFieldName> = FieldResult<"Query", TFieldName>,
  TIdentity extends Identity = Identity,
  TBatch extends boolean | undefined = undefined,
>(
  params: Omit<
    ResolverParams<"Query", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>,
    "typeName"
  >
): Resolver<"Query", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> {
  return createResolver<"Query", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>({
    ...params,
    typeName: "Query",
  });
}

export function createMutationResolver<
  TFieldName extends ObjectFieldName<"Mutation"> = ObjectFieldName<"Mutation">,
  TSource extends FieldSource<"Mutation", TFieldName> = FieldSource<"Mutation", TFieldName>,
  TArgs extends FieldArgs<"Mutation", TFieldName> = FieldArgs<"Mutation", TFieldName>,
  TResult extends FieldResult<"Mutation", TFieldName> = FieldResult<"Mutation", TFieldName>,
  TIdentity extends Identity = Identity,
  TBatch extends boolean | undefined = undefined,
>(
  params: Omit<
    ResolverParams<"Mutation", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>,
    "typeName"
  >
): Resolver<"Mutation", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> {
  return createResolver<"Mutation", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>({
    ...params,
    typeName: "Mutation",
  });
}

export function createSubscriptionResolver<
  TFieldName extends ObjectFieldName<"Subscription"> = ObjectFieldName<"Subscription">,
  TSource extends FieldSource<"Subscription", TFieldName> = FieldSource<"Subscription", TFieldName>,
  TArgs extends FieldArgs<"Subscription", TFieldName> = FieldArgs<"Subscription", TFieldName>,
  TResult extends FieldResult<"Subscription", TFieldName> = FieldResult<"Subscription", TFieldName>,
  TIdentity extends Identity = Identity,
  TBatch extends boolean | undefined = undefined,
>(
  params: Omit<
    ResolverParams<"Subscription", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch>,
    "typeName"
  >
): Resolver<"Subscription", TFieldName, TSource, TArgs, TResult, TIdentity, TBatch> {
  return createResolver({
    ...params,
    typeName: "Subscription",
  });
}
