import { GraphQLError } from "./errors.js";

export interface ResolverResult {
  data?: unknown;
  error?: {
    type: string;
    message: string;
  };
  stash?: Record<string, unknown>;
}

export function formatResult(
  data?: unknown | null,
  error?: unknown,
  stash?: Record<string, unknown>
): ResolverResult {
  const formattedResponse: ResolverResult = {};

  if (data !== undefined) {
    formattedResponse.data = data;
  }

  if (error) {
    if (error instanceof GraphQLError) {
      formattedResponse.error = {
        type: error.name,
        message: error.message,
      };
    } else {
      formattedResponse.error = {
        type: "InternalServerError",
        message: "An unexpected error occurred",
      };
    }
  }

  if (stash) {
    formattedResponse.stash = stash;
  }

  return formattedResponse;
}
