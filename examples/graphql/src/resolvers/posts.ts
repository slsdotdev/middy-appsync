import { randomUUID } from "node:crypto";
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { mutation, query } from "@middy-appsync/graphql";
import { POSTS_TABLE, ddb } from "../lib/ddb";
import { Post } from "../schema/types";

export const postQueries = query({
  getPost: async ({ args: { id } }) => {
    const { Item } = await ddb.send(new GetCommand({ TableName: POSTS_TABLE, Key: { id } }));
    return (Item as Post | undefined) ?? null;
  },
  listPosts: async () => {
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: POSTS_TABLE }));
    return Items as Post[];
  },
});

export const postMutations = mutation({
  createPost: async ({ args: { input } }) => {
    const post: Post = {
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      body: input.body,
    };
    await ddb.send(new PutCommand({ TableName: POSTS_TABLE, Item: post }));
    return post;
  },
  deletePost: async ({ args: { id } }) => {
    await ddb.send(new DeleteCommand({ TableName: POSTS_TABLE, Key: { id } }));
    return true;
  },
});
