import middy from "@middy/core";
import { appSyncGraphQLRouter } from "@middy-appsync/graphql";
import { resolvers } from "../resolvers/index.js";

export const handler = middy(appSyncGraphQLRouter({ resolvers })).use({
  before: (handler) => {
    console.log("Received event:", JSON.stringify(handler.event, null, 2));
  },
});
