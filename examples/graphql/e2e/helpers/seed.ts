import { gql } from "./client.js";
import type { Post, User } from "../../src/schema/types";

export async function createUser(input: { name: string; email: string }): Promise<User> {
  const res = await gql<{ createUser: User }>(
    /* GraphQL */ `
      mutation Create($input: CreateUserInput!) {
        createUser(input: $input) {
          id
          name
          email
        }
      }
    `,
    { input }
  );
  if (res.errors?.length || !res.data) {
    throw new Error(`createUser failed: ${JSON.stringify(res.errors)}`);
  }
  return res.data.createUser;
}

export async function createPost(input: {
  userId: string;
  title: string;
  body: string;
}): Promise<Post> {
  const res = await gql<{ createPost: Post }>(
    /* GraphQL */ `
      mutation Create($input: CreatePostInput!) {
        createPost(input: $input) {
          id
          userId
          title
          body
        }
      }
    `,
    { input }
  );
  if (res.errors?.length || !res.data) {
    throw new Error(`createPost failed: ${JSON.stringify(res.errors)}`);
  }
  return res.data.createPost;
}

export async function createUsersWithPosts(): Promise<{
  users: User[];
  postsByUser: Map<string, Post[]>;
}> {
  const users: User[] = [];
  const postsByUser = new Map<string, Post[]>();

  for (let i = 0; i < 3; i++) {
    const u = await createUser({ name: `user-${i}`, email: `u${i}@example.com` });
    users.push(u);
    const posts: Post[] = [];
    for (let j = 0; j < 2; j++) {
      posts.push(await createPost({ userId: u.id, title: `t-${i}-${j}`, body: `b-${i}-${j}` }));
    }
    postsByUser.set(u.id, posts);
  }

  return { users, postsByUser };
}
