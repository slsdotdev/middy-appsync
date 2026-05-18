import { beforeAll, describe, expect, it } from "vitest";
import { gql } from "../helpers/client.js";
import { clearAllTables } from "../helpers/ddb.js";
import { createUser, createUsersWithPosts } from "../helpers/seed.js";
import { Post, User } from "../../src/schema/types.js";

interface UserWithPosts extends User {
  posts: Pick<Post, "id" | "title">[];
}

describe("batch invoke (User.posts)", () => {
  let users: User[];
  let postsByUser: Map<string, Post[]>;

  beforeAll(async () => {
    await clearAllTables();
    ({ users, postsByUser } = await createUsersWithPosts());
  });

  it("returns each user's own posts when fetched in a list", async () => {
    const res = await gql<{ listUsers: UserWithPosts[] }>(/* GraphQL */ `
      query {
        listUsers {
          id
          posts {
            id
            title
          }
        }
      }
    `);

    expect(res.errors).toBeFalsy();
    const got = res.data?.listUsers ?? [];
    expect(got).toHaveLength(users.length);

    for (const u of got) {
      const expected = postsByUser.get(u.id) ?? [];
      const gotIds = u.posts.map((p) => p.id).sort();
      const expIds = expected.map((p) => p.id).sort();
      expect(gotIds).toEqual(expIds);
    }
  });

  it("returns an empty array for a user with no posts", async () => {
    const lone = await createUser({ name: "lonely", email: "lone@example.com" });

    const res = await gql<{ getUser: UserWithPosts | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getUser(id: $id) {
            id
            posts {
              id
            }
          }
        }
      `,
      { id: lone.id }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.getUser?.posts).toEqual([]);
  });
});
