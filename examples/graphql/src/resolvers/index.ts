import { defineResolvers } from "@middy-appsync/graphql";
import { errorQueries } from "./errors.js";
import { postMutations, postQueries } from "./posts.js";
import { userFields, userMutations, userQueries } from "./users.js";

export const resolvers = defineResolvers(
  userQueries,
  userMutations,
  userFields,
  postQueries,
  postMutations,
  errorQueries
);
