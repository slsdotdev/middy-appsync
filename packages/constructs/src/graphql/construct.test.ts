import { describe, expect, it } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { App, FileSystem, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { Definition, GraphqlApi } from "aws-cdk-lib/aws-appsync";
import { Code as LambdaCode, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { MiddyAppsyncGraphQLResolvers } from "./construct.js";
import { AnyResolver, createResolver } from "@middy-appsync/graphql";
import { mockTemplateSource } from "../utils/test-utils.js";

const SCHEMA = /* GraphQL */ `
  type Query {
    getUser(id: ID!): String
    listUsers: [String!]!
  }
`;

const UNIT_TEMPLATE = `
export const request = () => ({ payload: {} });
export const response = (ctx) => ctx.result;
`;

const PIPELINE_FN_TEMPLATE = `
export const request = (ctx) => ctx.prev?.result ?? {};
export const response = (ctx) => ctx.result;
`;

const resolvers = [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createResolver<any>({
    typeName: "Query",
    fieldName: "getUser",
    resolve: () => null,
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createResolver<any, any, any, any, any, any, true>({
    typeName: "Query",
    fieldName: "listUsers",
    resolve: () => [],
    batch: true,
  }),
];

function createTestTemplate(resolvers: AnyResolver[] = [], templateSource?: string) {
  const app = new App({ context: { "aws:cdk:bundling-stacks": [] } });
  const stack = new Stack(app, "TestStack");

  const tempDir = FileSystem.mkdtemp("test-fixtures-");
  fs.writeFileSync(path.join(tempDir, "schema.graphql"), SCHEMA);

  const api = new GraphqlApi(stack, "Api", {
    name: "test-api",
    definition: Definition.fromFile(path.join(tempDir, "schema.graphql")),
  });

  const handler = new LambdaFunction(stack, "Handler", {
    runtime: Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: LambdaCode.fromInline("exports.handler = async () => null;"),
  });

  const lambdaDataSource = api.addLambdaDataSource("MainDs", handler);
  const noneDataSource = api.addNoneDataSource("NoneDs", { name: "ddb" });

  new MiddyAppsyncGraphQLResolvers(stack, "Resolvers", {
    api,
    resolvers: resolvers,
    dataSource: lambdaDataSource,
    additionalDataSources: {
      lambda: lambdaDataSource,
      ddb: noneDataSource,
    },
    templateSource,
  });

  return Template.fromStack(stack);
}

describe("MiddyAppsyncGraphQLResolvers", () => {
  it("creates default unit and batch resolvers attached to the main lambda data source", () => {
    const template = createTestTemplate(resolvers);

    template.resourceCountIs("AWS::AppSync::Resolver", 2);
    template.hasResourceProperties("AWS::AppSync::Resolver", {
      TypeName: "Query",
      FieldName: "getUser",
      DataSourceName: Match.anyValue(),
      Runtime: { Name: "APPSYNC_JS", RuntimeVersion: "1.0.0" },
      MaxBatchSize: Match.absent(),
    });

    template.hasResourceProperties("AWS::AppSync::Resolver", {
      TypeName: "Query",
      FieldName: "listUsers",
      MaxBatchSize: 100,
    });
  });

  it("uses a custom field template when one matches and routes to the named data source", () => {
    const templateDir = mockTemplateSource({
      "Query.getUser.ts": `/**\n * @dataSource ddb\n */\n${UNIT_TEMPLATE}`,
    });

    const template = createTestTemplate([resolvers[0]], templateDir);

    template.resourceCountIs("AWS::AppSync::Resolver", 1);

    template.hasResourceProperties("AWS::AppSync::Resolver", {
      TypeName: "Query",
      FieldName: "getUser",
      DataSourceName: "ddb",
    });
  });

  it("creates a pipeline resolver with one AppsyncFunction per @pipeline entry", () => {
    const templateDir = mockTemplateSource({
      "Query.getUser.ts": `/**\n * @pipeline stepA, stepB\n */\n${UNIT_TEMPLATE}`,
      "stepA.ts": PIPELINE_FN_TEMPLATE,
      "stepB.ts": `/**\n * @dataSource ddb\n */\n${PIPELINE_FN_TEMPLATE}`,
    });

    const template = createTestTemplate([], templateDir);

    template.resourceCountIs("AWS::AppSync::Resolver", 1);
    template.resourceCountIs("AWS::AppSync::FunctionConfiguration", 2);

    template.hasResourceProperties("AWS::AppSync::Resolver", {
      TypeName: "Query",
      FieldName: "getUser",
      Kind: "PIPELINE",
      PipelineConfig: {
        Functions: Match.arrayWith([
          Match.objectLike({
            "Fn::GetAtt": Match.arrayWith([Match.stringLikeRegexp("stepA"), "FunctionId"]),
          }),
          Match.objectLike({
            "Fn::GetAtt": Match.arrayWith([Match.stringLikeRegexp("stepB"), "FunctionId"]),
          }),
        ]),
      },
    });
  });

  it("throws when a referenced pipeline function template is missing", () => {
    const templateDir = mockTemplateSource({
      "Query.getUser.ts": `/**\n * @pipeline missing\n */\n${UNIT_TEMPLATE}`,
    });

    expect(() => {
      createTestTemplate([], templateDir);
    }).toThrow(/Pipeline function "missing" not found/);
  });

  it("throws when a template references an unknown @dataSource", () => {
    const templateDir = mockTemplateSource({
      "Query.getUser.ts": `/**\n * @dataSource unknownDs\n */\n${UNIT_TEMPLATE}`,
    });

    expect(() => {
      createTestTemplate([], templateDir);
    }).toThrow(/Data source "unknownDs" not found/);
  });

  it("applies maxBatchSize to a custom-template resolver when the matching resolver is batch", () => {
    const templateDir = mockTemplateSource({
      "Query.listUsers.ts": `/**\n * @dataSource lambda\n */\n${UNIT_TEMPLATE}`,
    });
    const template = createTestTemplate([resolvers[1]], templateDir);

    template.hasResourceProperties("AWS::AppSync::Resolver", {
      TypeName: "Query",
      FieldName: "listUsers",
      MaxBatchSize: 100,
    });
  });
});
