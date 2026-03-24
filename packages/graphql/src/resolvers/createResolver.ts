import middy, { MiddlewareObj, MiddyfiedHandler } from "@middy/core";
import { AppSyncResolverEvent, Context } from "aws-lambda";

export type ResolveHandler<TSource, TArgs, TResult> = (
  event: AppSyncResolverEvent<TArgs, TSource>,
  context: Context
) => Promise<TResult> | TResult;

export type BatchResolveHandler<TSource, TArgs, TResult> = (
  events: AppSyncResolverEvent<TArgs, TSource>[],
  context: Context
) => Promise<TResult[]> | TResult[];

export interface ResolverParams<
  TSource,
  TArgs,
  TResult,
  TBatch extends boolean | undefined = undefined,
> {
  typeName: string;
  fieldName: string;
  authorize?: unknown;
  batch?: TBatch;
  resolve: TBatch extends true
    ? BatchResolveHandler<TSource, TArgs, TResult>
    : ResolveHandler<TSource, TArgs, TResult>;
}

export type ResolverEvent<TSource, TArgs, TBatch extends boolean | undefined> = TBatch extends true
  ? AppSyncResolverEvent<TArgs, TSource>[]
  : AppSyncResolverEvent<TArgs, TSource>;

export interface Resolver<TSource, TArgs, TResult, TBatch extends boolean | undefined = undefined> {
  typeName: string;
  fieldName: string;
  batch?: TBatch;
  handler: MiddyfiedHandler<ResolverEvent<TArgs, TSource, TBatch>, TResult, Error, Context>;
  use(middleware: MiddlewareObj): Resolver<TSource, TArgs, TResult, TBatch>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyResolver = Resolver<any, any, any> | Resolver<any, any, any, true>;

export function createResolver<
  TSource,
  TArgs,
  TResult,
  TBatch extends boolean | undefined = undefined,
>(
  params: ResolverParams<TSource, TArgs, TResult, TBatch>
): Resolver<TSource, TArgs, TResult, TBatch> {
  const handler = middy<ResolverEvent<TArgs, TSource, TBatch>, TResult, Error, Context>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params.resolve as any
  );

  // TODO: Implement authorization middleware based on `params.authorize`

  const resolver: Resolver<TSource, TArgs, TResult, TBatch> = {
    typeName: params.typeName,
    fieldName: params.fieldName,
    handler,
    batch: params.batch,
    use(middleware: MiddlewareObj<ResolverEvent<TSource, TArgs, TBatch>, TResult, Error, Context>) {
      handler.use(middleware);
      return resolver;
    },
  };

  return resolver;
}

export function createQueryResolver<TSource, TArgs, TResult, TBatch extends undefined>(
  params: Omit<ResolverParams<TSource, TArgs, TResult, TBatch>, "typeName">
): Resolver<TSource, TArgs, TResult, TBatch> {
  return createResolver<TSource, TArgs, TResult, TBatch>({
    ...params,
    typeName: "Query",
  });
}

export function createMutationResolver<TSource, TArgs, TResult, TBatch extends undefined>(
  params: Omit<ResolverParams<TSource, TArgs, TResult, TBatch>, "typeName">
): Resolver<TSource, TArgs, TResult, TBatch> {
  return createResolver({
    ...params,
    typeName: "Mutation",
  });
}

export function createSubscriptionResolver<TSource, TArgs, TResult, TBatch extends undefined>(
  params: Omit<ResolverParams<TSource, TArgs, TResult, TBatch>, "typeName">
): Resolver<TSource, TArgs, TResult, TBatch> {
  return createResolver({
    ...params,
    typeName: "Subscription",
  });
}

export function isBatchResolver<TSource, TArgs, TResult>(
  resolver: AnyResolver
): resolver is Resolver<TSource, TArgs, TResult, true> {
  return "batch" in resolver && resolver.batch === true;
}
