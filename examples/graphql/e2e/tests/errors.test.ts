import { describe, expect, it } from "vitest";
import { gql } from "../helpers/client.js";

describe("error path", () => {
  it("failingQuery surfaces the GraphQLError type and message", async () => {
    const res = await gql<{ failingQuery: string | null }>(
      /* GraphQL */ `
        query {
          failingQuery
        }
      `
    );

    expect(res.data?.failingQuery).toBeNull();
    expect(res.errors).toBeDefined();
    expect(res.errors?.[0]?.errorType).toBe("IntentionalError");
    expect(res.errors?.[0]?.message).toBe("BOOM");
  });
});
