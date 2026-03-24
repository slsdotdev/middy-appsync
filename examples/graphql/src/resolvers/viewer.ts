import { createResolver, createQueryResolver } from "@middy-appsync/graphql";

export const viewer = createQueryResolver({
  fieldName: "user",
  resolve: () => {
    return {
      id: "123",
      name: "John Doe",
    };
  },
});

export const me = createResolver({
  typeName: "Query",
  fieldName: "user",
  batch: true,
  resolve: () => {
    return [
      {
        id: "123",
        name: "John Doe",
      },
    ];
  },
});
