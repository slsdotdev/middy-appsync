import { defineResolvers } from "@middy-appsync/graphql";
import { failingQuery } from "./errors.js";
import { createPost, deletePost, getPost, listPosts } from "./posts.js";
import { userDisplayName, userPosts } from "./user-fields.js";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "./users.js";

export const resolvers = defineResolvers(
  getUser,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getPost,
  listPosts,
  createPost,
  deletePost,
  userDisplayName,
  userPosts,
  failingQuery
);
