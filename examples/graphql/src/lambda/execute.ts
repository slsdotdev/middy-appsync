import middy from "@middy/core";
import { appSyncGraphQLRouter } from "@middy-appsync/graphql";
import { resolvers } from "../resolvers/index.js";

export const handler = middy(appSyncGraphQLRouter({ resolvers })).use({
  before: (handler) => {
    console.log(
      "Received event:",
      JSON.stringify(
        {
          args: handler.event.arguments,
          info: handler.event.info,
        },
        null,
        2
      )
    );
  },
});
