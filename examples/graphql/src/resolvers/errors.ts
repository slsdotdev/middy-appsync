import { GraphQLError, query } from "@middy-appsync/graphql";

class IntentionalError extends GraphQLError {
  constructor(message: string) {
    super(message);
    this.name = "IntentionalError";
  }
}

export const errorQueries = query({
  failingQuery: (): string | null => {
    throw new IntentionalError("BOOM");
  },
});
