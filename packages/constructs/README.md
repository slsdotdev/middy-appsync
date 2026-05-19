# @middy-appsync/constructs

CDK constructs that wire [`@middy-appsync/graphql`](../graphql) resolvers into an AWS AppSync `GraphqlApi`.

```bash
npm install @middy-appsync/constructs @middy-appsync/graphql aws-cdk-lib constructs esbuild
```

Peer dependencies: `@middy-appsync/graphql >= 0.1.4`, `esbuild >= 0.27`.

## `MiddyAppsyncGraphQLResolvers`

Creates one AppSync unit resolver per entry in `resolvers`, all bound to the
Lambda data source you supply. The Lambda is expected to run
`appSyncGraphQLRouter`, which dispatches each invocation to the matching
resolver by `typeName.fieldName`.

### Props

| Prop                     | Type                              | Required | Description                                                                         |
| ------------------------ | --------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `api`                    | `IGraphqlApi`                     | Yes      | The AppSync GraphQL API the resolvers attach to.                                    |
| `resolvers`              | `AnyResolver[]`                   | Yes      | Resolver array from `@middy-appsync/graphql` (`defineResolvers` / `query` / …).     |
| `dataSource`             | `LambdaDataSource`                | Yes      | Lambda data source for the function that runs `appSyncGraphQLRouter`.               |
| `additionalDataSources`  | `Record<string, BaseDataSource>?` | No       | Advanced — additional data sources referenced by custom resolver templates.         |
| `templateSource`         | `string \| string[]?`             | No       | Advanced — paths to TS resolver templates (`{typeName}.{fieldName}.ts`) to bundle.  |

## Usage

```ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Duration, Expiration, Stack } from "aws-cdk-lib";
import { AuthorizationType, Definition, GraphqlApi } from "aws-cdk-lib/aws-appsync";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { MiddyAppsyncGraphQLResolvers } from "@middy-appsync/constructs";
import { resolvers } from "../../src/resolvers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ExampleStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, "ResolverHandler", {
      runtime: Runtime.NODEJS_24_X,
      entry: path.join(__dirname, "../../src/lambda/execute.ts"),
      handler: "handler",
      bundling: { format: OutputFormat.ESM, target: "node24" },
    });

    const api = new GraphqlApi(this, "Api", {
      name: "MiddyAppsyncExample",
      definition: Definition.fromFile(path.join(__dirname, "../../src/schema/schema.graphql")),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY,
          apiKeyConfig: { expires: Expiration.after(Duration.days(7)) },
        },
      },
    });

    const dataSource = api.addLambdaDataSource("LambdaDs", handler);

    new MiddyAppsyncGraphQLResolvers(this, "Resolvers", {
      api,
      resolvers: [...resolvers],
      dataSource,
    });
  }
}
```

The matching `handler` runs the router:

```ts
import middy from "@middy/core";
import { appSyncGraphQLRouter } from "@middy-appsync/graphql";
import { resolvers } from "../resolvers/index.js";

export const handler = middy(appSyncGraphQLRouter({ resolvers }));
```

## Advanced

`templateSource` and `additionalDataSources` let you mix custom AppSync JS
resolver templates and non-Lambda data sources (DynamoDB, HTTP, …) with the
router-driven Lambda resolvers. Templates are TypeScript files named
`{typeName}.{fieldName}.ts`; `@datasource <name>` and `@pipeline <fn1>, <fn2>`
JSDoc tags pick the data source and (optionally) the pipeline functions for
each entry. This surface is still evolving — see
[`packages/constructs/src/graphql/construct.ts`](./src/graphql/construct.ts)
until it's covered by an example.

## Example

A complete CDK stack using this construct is in
[`examples/graphql/`](../../examples/graphql).

## License

MIT
