import { beforeAll, describe, expect, it } from "vitest";
import { gql } from "../helpers/client.js";
import { clearAllTables } from "../helpers/ddb.js";
import { createUser, type User } from "../helpers/seed.js";

describe("field resolvers", () => {
  let alice: User;

  beforeAll(async () => {
    await clearAllTables();
    alice = await createUser({ name: "alice", email: "alice@example.com" });
  });

  it("User.displayName uppercases the source name", async () => {
    const res = await gql<{ getUser: (User & { displayName: string }) | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getUser(id: $id) {
            id
            name
            displayName
          }
        }
      `,
      { id: alice.id }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.getUser?.displayName).toBe("ALICE");
  });
});
