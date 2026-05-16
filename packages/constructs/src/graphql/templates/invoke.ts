import { Context, LambdaRequest, util } from "@aws-appsync/utils";
import type { ResolverResult } from "@middy-appsync/graphql/utils";

export function request(ctx: Context): LambdaRequest {
  return {
    operation: "Invoke",
    invocationType: "RequestResponse",
    payload: ctx,
  };
}

export function response(ctx: Context) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  const result = ctx.result as ResolverResult;

  if (result.error) {
    util.error(result.error.message, result.error.type);
  }

  if (result.stash) {
    Object.assign(ctx.stash, result.stash);
  }

  return result.data ?? null;
}
