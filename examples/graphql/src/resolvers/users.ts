import { randomUUID } from "node:crypto";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mutation, object, query } from "@middy-appsync/graphql";
import { POSTS_BY_USER_INDEX, POSTS_TABLE, USERS_TABLE, ddb } from "../lib/ddb";
import { Post, User } from "../schema/types";

export const userQueries = query({
  getUser: async ({ args: { id } }) => {
    const { Item } = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id } }));
    return (Item as User | undefined) ?? null;
  },
  listUsers: async () => {
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
    return Items as User[];
  },
});

export const userMutations = mutation({
  createUser: async ({ args: { input } }) => {
    const user: User = { id: randomUUID(), name: input.name, email: input.email };
    await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
    return user;
  },
  updateUser: async ({ args: { id, input } }) => {
    const sets: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    if (input.name !== undefined) {
      sets.push("#name = :name");
      names["#name"] = "name";
      values[":name"] = input.name;
    }
    if (input.email !== undefined) {
      sets.push("#email = :email");
      names["#email"] = "email";
      values[":email"] = input.email;
    }

    if (sets.length === 0) {
      const { Item } = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id } }));
      return (Item as User | undefined) ?? null;
    }

    const { Attributes } = await ddb
      .send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { id },
          UpdateExpression: `SET ${sets.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: "attribute_exists(id)",
          ReturnValues: "ALL_NEW",
        })
      )
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
          return { Attributes: undefined };
        }
        throw err;
      });

    return (Attributes as User | undefined) ?? null;
  },
  deleteUser: async ({ args: { id } }) => {
    await ddb.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { id } }));
    return true;
  },
});

export const userFields = object("User", {
  displayName: {
    resolve: async ({ source }) => source.name.toUpperCase(),
  },
  posts: {
    batchResolve: async (events) => {
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
  },
});
