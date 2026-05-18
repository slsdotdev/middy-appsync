import { randomUUID } from "node:crypto";
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createMutationResolver, createQueryResolver } from "@middy-appsync/graphql";
import { POSTS_TABLE, ddb } from "../lib/ddb";
import { Post } from "../schema/types";

export const getPost = createQueryResolver({
  fieldName: "getPost",
  resolve: async ({ args: { id } }) => {
    const { Item } = await ddb.send(new GetCommand({ TableName: POSTS_TABLE, Key: { id } }));
    return (Item as Post | undefined) ?? null;
  },
});

export const listPosts = createQueryResolver({
  fieldName: "listPosts",
  resolve: async () => {
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: POSTS_TABLE }));
    return Items as Post[];
  },
});

export const createPost = createMutationResolver({
  fieldName: "createPost",
  resolve: async ({ args: { input } }) => {
    const post: Post = {
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      body: input.body,
    };
    await ddb.send(new PutCommand({ TableName: POSTS_TABLE, Item: post }));
    return post;
  },
});

export const deletePost = createMutationResolver({
  fieldName: "deletePost",
  resolve: async ({ args: { id } }) => {
    await ddb.send(new DeleteCommand({ TableName: POSTS_TABLE, Key: { id } }));
    return true;
  },
});
