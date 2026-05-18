import { beforeAll, describe, expect, it } from "vitest";
import { gql } from "../helpers/client.js";
import { clearAllTables } from "../helpers/ddb.js";
import { createPost, createUser, type Post, type User } from "../helpers/seed.js";

describe("queries", () => {
  let alice: User;
  let bob: User;
  let alicePost: Post;

  beforeAll(async () => {
    await clearAllTables();
    alice = await createUser({ name: "Alice", email: "alice@example.com" });
    bob = await createUser({ name: "Bob", email: "bob@example.com" });
    alicePost = await createPost({
      userId: alice.id,
      title: "Hello",
      body: "world",
    });
  });

  it("getUser returns the matching user", async () => {
    const res = await gql<{ getUser: User | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getUser(id: $id) {
            id
            name
            email
          }
        }
      `,
      { id: alice.id }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.getUser).toEqual(alice);
  });

  it("getUser returns null for unknown id", async () => {
    const res = await gql<{ getUser: User | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getUser(id: $id) {
            id
          }
        }
      `,
      { id: "does-not-exist" }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.getUser).toBeNull();
  });

  it("listUsers returns all users", async () => {
    const res = await gql<{ listUsers: User[] }>(
      /* GraphQL */ `
        query {
          listUsers {
            id
            name
          }
        }
      `
    );

    expect(res.errors).toBeFalsy();
    const ids = res.data?.listUsers.map((u) => u.id).sort();
    expect(ids).toEqual([alice.id, bob.id].sort());
  });

  it("getPost returns the matching post", async () => {
    const res = await gql<{ getPost: Post | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getPost(id: $id) {
            id
            userId
            title
            body
          }
        }
      `,
      { id: alicePost.id }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.getPost).toEqual(alicePost);
  });

  it("listPosts returns seeded posts", async () => {
    const res = await gql<{ listPosts: Post[] }>(
      /* GraphQL */ `
        query {
          listPosts {
            id
            userId
          }
        }
      `
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.listPosts.map((p) => p.id)).toContain(alicePost.id);
  });
});
