import { beforeAll, describe, expect, it } from "vitest";
import { gql } from "../helpers/client.js";
import { clearAllTables } from "../helpers/ddb.js";
import { createUser } from "../helpers/seed.js";
import { Post, User } from "../../src/schema/types.js";

describe("mutations", () => {
  beforeAll(async () => {
    await clearAllTables();
  });

  it("createUser round-trips via getUser", async () => {
    const created = await createUser({ name: "Carol", email: "carol@example.com" });

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
      { id: created.id }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.getUser).toEqual(created);
  });

  it("updateUser changes fields and returns the updated user", async () => {
    const created = await createUser({ name: "Dan", email: "dan@example.com" });

    const res = await gql<{ updateUser: User | null }>(
      /* GraphQL */ `
        mutation ($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            email
          }
        }
      `,
      { id: created.id, input: { name: "Daniel" } }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.updateUser).toEqual({
      id: created.id,
      name: "Daniel",
      email: "dan@example.com",
    });
  });

  it("updateUser returns null when the user does not exist", async () => {
    const res = await gql<{ updateUser: User | null }>(
      /* GraphQL */ `
        mutation ($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
          }
        }
      `,
      { id: "missing", input: { name: "Nobody" } }
    );

    expect(res.errors).toBeFalsy();
    expect(res.data?.updateUser).toBeNull();
  });

  it("deleteUser removes the user", async () => {
    const created = await createUser({ name: "Eve", email: "eve@example.com" });

    const del = await gql<{ deleteUser: boolean }>(
      /* GraphQL */ `
        mutation ($id: ID!) {
          deleteUser(id: $id)
        }
      `,
      { id: created.id }
    );
    expect(del.errors).toBeFalsy();
    expect(del.data?.deleteUser).toBe(true);

    const after = await gql<{ getUser: User | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getUser(id: $id) {
            id
          }
        }
      `,
      { id: created.id }
    );
    expect(after.data?.getUser).toBeNull();
  });

  it("createPost and deletePost round-trip", async () => {
    const user = await createUser({ name: "Frank", email: "frank@example.com" });

    const created = await gql<{ createPost: Post }>(
      /* GraphQL */ `
        mutation ($input: CreatePostInput!) {
          createPost(input: $input) {
            id
            userId
            title
            body
          }
        }
      `,
      { input: { userId: user.id, title: "T", body: "B" } }
    );
    expect(created.errors).toBeFalsy();
    const post = created.data?.createPost;
    expect(post?.userId).toBe(user.id);

    const del = await gql<{ deletePost: boolean }>(
      /* GraphQL */ `
        mutation ($id: ID!) {
          deletePost(id: $id)
        }
      `,
      { id: post?.id }
    );
    expect(del.data?.deletePost).toBe(true);

    const after = await gql<{ getPost: Post | null }>(
      /* GraphQL */ `
        query ($id: ID!) {
          getPost(id: $id) {
            id
          }
        }
      `,
      { id: post?.id }
    );
    expect(after.data?.getPost).toBeNull();
  });
});
