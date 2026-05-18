import { randomUUID } from "node:crypto";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { createMutationResolver, createQueryResolver } from "@middy-appsync/graphql";
import { USERS_TABLE, ddb } from "../lib/ddb";
import { User } from "../schema/types";

export const getUser = createQueryResolver({
  fieldName: "getUser",
  resolve: async ({ args: { id } }) => {
    const { Item } = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id } }));
    return (Item as User | undefined) ?? null;
  },
});

export const listUsers = createQueryResolver({
  fieldName: "listUsers",
  resolve: async () => {
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
    return Items as User[];
  },
});

export const createUser = createMutationResolver({
  fieldName: "createUser",
  resolve: async ({ args: { input } }) => {
    const user: User = { id: randomUUID(), name: input.name, email: input.email };
    await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
    return user;
  },
});

export const updateUser = createMutationResolver({
  fieldName: "updateUser",
  resolve: async ({ args: { id, input } }) => {
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
});

export const deleteUser = createMutationResolver({
  fieldName: "deleteUser",
  resolve: async ({ args: { id } }) => {
    await ddb.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { id } }));
    return true;
  },
});
