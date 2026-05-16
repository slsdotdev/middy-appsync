import { Context, LambdaRequest, util } from "@aws-appsync/utils";
import type { ResolverResult } from "@middy-appsync/graphql/utils";

export function request(ctx: Context): LambdaRequest {
  return {
    operation: "BatchInvoke",
    invocationType: "RequestResponse",
    payload: ctx,
  };
}

export function response(ctx: Context) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  const result = ctx.result as ResolverResult[];
  const responses: unknown[] = [];

  for (const res of result) {
    if (res.error) {
      util.appendError(res.error.message, res.error.type);
    }

    if (res.stash) {
      Object.assign(ctx.stash, res.stash);
    }

    responses.push(res.data ?? null);
  }

  return responses;
}
