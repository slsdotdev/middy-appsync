import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createResolver } from "@middy-appsync/graphql";
import { POSTS_BY_USER_INDEX, POSTS_TABLE, ddb } from "../lib/ddb";
import { Post } from "../schema/types";

export const userDisplayName = createResolver({
  typeName: "User",
  fieldName: "displayName",
  resolve: ({ source }) => source.name.toUpperCase(),
});

export const userPosts = createResolver({
  typeName: "User",
  fieldName: "posts",
  batch: true,
  resolve: async (events) => {
    return Promise.all(
      events.map(async ({ source }) => {
        const { Items = [] } = await ddb.send(
          new QueryCommand({
            TableName: POSTS_TABLE,
            IndexName: POSTS_BY_USER_INDEX,
            KeyConditionExpression: "userId = :uid",
            ExpressionAttributeValues: { ":uid": source.id },
          })
        );
        return Items as Post[];
      })
    );
  },
});
