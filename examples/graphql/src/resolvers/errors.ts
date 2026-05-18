import { GraphQLError, createQueryResolver } from "@middy-appsync/graphql";

class IntentionalError extends GraphQLError {
  constructor(message: string) {
    super(message);
    this.name = "IntentionalError";
  }
}

export const failingQuery = createQueryResolver({
  fieldName: "failingQuery",
  resolve: (): string | null => {
    throw new IntentionalError("BOOM");
  },
});
