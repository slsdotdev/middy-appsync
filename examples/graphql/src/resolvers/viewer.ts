import {
  createMutationResolver,
  createQueryResolver,
  createResolver,
  defineResolvers,
  isCognito,
} from "@middy-appsync/graphql";

const userName = createResolver({
  typeName: "User",
  fieldName: "name",
  // batch: true,
  authorize: isCognito,
  resolve: (event) => {
    return event.identity.username;
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
  resolve: ({ args: { input } }) => {
    return {
      id: input.id,
      name: input.name,
    };
  },
});

export default defineResolvers(userName, viewer, createUser);
