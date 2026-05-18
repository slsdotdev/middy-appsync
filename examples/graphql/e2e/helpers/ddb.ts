import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
export const ddb = DynamoDBDocumentClient.from(client);

async function clearTable(tableName: string) {
  const { Items = [] } = await ddb.send(
    new ScanCommand({ TableName: tableName, ProjectionExpression: "id" })
  );

  for (let i = 0; i < Items.length; i += 25) {
    const chunk = Items.slice(i, i + 25);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((it) => ({ DeleteRequest: { Key: { id: (it as { id: string }).id } } })),
        },
      })
    );
  }
}

export async function clearAllTables() {
  const usersTable = process.env.USERS_TABLE;
  const postsTable = process.env.POSTS_TABLE;
  if (!usersTable || !postsTable) {
    throw new Error("USERS_TABLE and POSTS_TABLE must be set");
  }
  await Promise.all([clearTable(usersTable), clearTable(postsTable)]);
}
