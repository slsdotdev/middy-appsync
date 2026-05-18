import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);

export const USERS_TABLE = process.env.USERS_TABLE ?? "";
export const POSTS_TABLE = process.env.POSTS_TABLE ?? "";
export const POSTS_BY_USER_INDEX = "byUserId";
