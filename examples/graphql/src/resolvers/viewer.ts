import {
  createMutationResolver,
  createQueryResolver,
  createResolver,
  defineResolvers,
} from "@middy-appsync/graphql";

const userName = createResolver({
  typeName: "User",
  fieldName: "name",
  authorize: () => true,
  resolve: ({ source }) => {
    return source.name;
  },
});

const viewer = createQueryResolver({
  fieldName: "me",
  resolve: () => {
    return {
      id: "123",
      name: "John Doe",
    };
  },
});

const createUser = createMutationResolver({
  fieldName: "createUser",
  resolve: ({ arguments: { input } }) => {
    return {
      id: input.id,
      name: input.name,
    };
  },
});

export default defineResolvers(userName, viewer, createUser);
