import {
  CreatePostInput,
  CreateUserInput,
  Post,
  UpdateUserInput,
  User,
} from "./src/schema/types.js";

declare module "@middy-appsync/graphql" {
  interface Definition {
    User: {
      id: { source: User; args: Record<string, never>; result: string };
      name: { source: User; args: Record<string, never>; result: string };
      email: { source: User; args: Record<string, never>; result: string };
      displayName: { source: User; args: Record<string, never>; result: string };
      posts: { source: User; args: Record<string, never>; result: Post[] };
    };

    Post: {
      id: { source: Post; args: Record<string, never>; result: string };
      userId: { source: Post; args: Record<string, never>; result: string };
      title: { source: Post; args: Record<string, never>; result: string };
      body: { source: Post; args: Record<string, never>; result: string };
    };

    Query: {
      getUser: { source: null; args: { id: string }; result: User | null };
      listUsers: { source: null; args: Record<string, never>; result: User[] };
      getPost: { source: null; args: { id: string }; result: Post | null };
      listPosts: { source: null; args: Record<string, never>; result: Post[] };
      failingQuery: { source: null; args: Record<string, never>; result: string | null };
    };

    Mutation: {
      createUser: { source: null; args: { input: CreateUserInput }; result: User };
      updateUser: {
        source: null;
        args: { id: string; input: UpdateUserInput };
        result: User | null;
      };
      deleteUser: { source: null; args: { id: string }; result: boolean };
      createPost: { source: null; args: { input: CreatePostInput }; result: Post };
      deletePost: { source: null; args: { id: string }; result: boolean };
    };
  }
}
