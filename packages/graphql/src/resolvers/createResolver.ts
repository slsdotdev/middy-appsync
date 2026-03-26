import middy, { MiddlewareObj, MiddyfiedHandler } from "@middy/core";
import { AppSyncIdentity, Context } from "aws-lambda";
import { hasProperty } from "../utils/typeGuards.js";
import {
  DefinitionTypename,
  FieldArgs,
  FieldResult,
  FieldSource,
  ObjectFieldName,
} from "../utils/definition.js";
import { ResolverEvent, TypedAppSyncResolverEvent } from "../utils/event.js";
import { AnyIdentity } from "../utils/auth.js";

export type ResolveHandler<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TResult extends FieldResult<TTypeName, TFieldName>,
  TIdentity extends AnyIdentity,
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
  TIdentity extends AnyIdentity,
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
  TIdentity extends AnyIdentity,
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
  | Resolver<any, any, any, any, any, any, undefined>
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
  TIdentity extends AnyIdentity,
  TBatch extends boolean | undefined,
> {
  typeName: TTypeName;
  fieldName: TFieldName;
  batch?: TBatch;
  authorize?: TIdentity extends AppSyncIdentity
    ? (identity: AppSyncIdentity) => identity is TIdentity
    : (identity: AnyIdentity) => TIdentity;
  resolve: TBatch extends true
    ? BatchResolveHandler<TTypeName, TFieldName, TSource, TArgs, TResult, TIdentity>
    : ResolveHandler<TTypeName, TFieldName, TSource, TArgs, TResult, NoInfer<TIdentity>>;
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
  TIdentity extends AnyIdentity = AnyIdentity,
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

  // TODO: Implement authorization middleware based on `params.authorize`

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
  TIdentity extends AnyIdentity = AppSyncIdentity,
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
  TIdentity extends AnyIdentity = AppSyncIdentity,
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
  TIdentity extends AnyIdentity = AppSyncIdentity,
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
