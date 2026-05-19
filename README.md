# middy-appsync

Router, middlewares, and utils to speed up development for AWS AppSync Lambda Resolvers. Powered by [Middy.js](https://middy.js.org).

| Surface          | Status      |
| ---------------- | ----------- |
| AppSync GraphQL  | In progress |
| AppSync Events   | Planned     |

## Packages

| Package                                                     | Description                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`@middy-appsync/graphql`](./packages/graphql)              | Router, resolver builders, authorization middleware, identity helpers.     |
| [`@middy-appsync/constructs`](./packages/constructs)        | CDK constructs that wire the router into an AppSync `GraphqlApi`.          |

## Quickstart

Install the runtime package alongside Middy:

```bash
npm install @middy-appsync/graphql @middy/core
```

Define resolvers using `query` / `mutation` / `object` and compose them with
`defineResolvers`:

```ts
// src/resolvers/users.ts
import { mutation, object, query } from "@middy-appsync/graphql";

export const userQueries = query({
  getUser: async ({ args: { id } }) => loadUser(id),
  listUsers: async () => listAllUsers(),
});

export const userMutations = mutation({
  createUser: async ({ args: { input } }) => createUserRecord(input),
});

export const userFields = object("User", {
  displayName: async ({ source }) => source.name.toUpperCase(),
});
```

```ts
// src/resolvers/index.ts
import { defineResolvers } from "@middy-appsync/graphql";
import { userFields, userMutations, userQueries } from "./users.js";

export const resolvers = defineResolvers(userQueries, userMutations, userFields);
```

Wrap the router in a Middy handler — that's the Lambda entry point:

```ts
// src/lambda/execute.ts
import middy from "@middy/core";
import { appSyncGraphQLRouter } from "@middy-appsync/graphql";
import { resolvers } from "../resolvers/index.js";

export const handler = middy(appSyncGraphQLRouter({ resolvers }));
```

Wire it up in CDK with `@middy-appsync/constructs`:

```bash
npm install @middy-appsync/constructs aws-cdk-lib constructs esbuild
```

```ts
import { MiddyAppsyncGraphQLResolvers } from "@middy-appsync/constructs";
import { resolvers } from "../../src/resolvers";

const dataSource = api.addLambdaDataSource("LambdaDs", handler);

new MiddyAppsyncGraphQLResolvers(this, "Resolvers", {
  api,
  resolvers: [...resolvers],
  dataSource,
});
```

## Example

[`examples/graphql/`](./examples/graphql) is an end-to-end CDK app: a Users +
Posts CRUD GraphQL API backed by DynamoDB, fronted by AppSync with API-key
auth. It exercises queries, mutations, nested field resolvers, batch
resolvers, and custom errors.

```bash
cd examples/graphql
npx cdk deploy
```

## Requirements

- Node.js >= 22.16
- `@middy/core` >= 7 (peer dependency of `@middy-appsync/graphql`)

## Development

This is a Turborepo monorepo using npm workspaces.

```bash
npm install          # install
npm run build        # build all packages
npm run test         # run all tests
npm run lint         # lint all packages
```

See [`CLAUDE.md`](./CLAUDE.md) for repo conventions.

## License

[MIT](./LICENSE)
