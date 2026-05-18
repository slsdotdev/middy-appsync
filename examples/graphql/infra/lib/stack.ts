import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CfnOutput,
  Duration,
  Expiration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { AuthorizationType, Definition, FieldLogLevel, GraphqlApi } from "aws-cdk-lib/aws-appsync";
import { AttributeType, BillingMode, ProjectionType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { MiddyAppsyncGraphQLResolvers } from "@middy-appsync/constructs";
import type { Construct } from "constructs";
import { resolvers } from "../../src/resolvers";
import { POSTS_BY_USER_INDEX } from "../../src/lib/ddb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exampleRoot = path.resolve(__dirname, "..", "..");

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const usersTable = new Table(this, "UsersTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const postsTable = new Table(this, "PostsTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    postsTable.addGlobalSecondaryIndex({
      indexName: POSTS_BY_USER_INDEX,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    const handler = new NodejsFunction(this, "ResolverHandler", {
      runtime: Runtime.NODEJS_24_X,
      entry: path.join(exampleRoot, "src/lambda/execute.ts"),
      handler: "handler",
      timeout: Duration.seconds(15),
      memorySize: 512,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        USERS_TABLE: usersTable.tableName,
        POSTS_TABLE: postsTable.tableName,
      },
      bundling: {
        format: OutputFormat.ESM,
        target: "node24",
        externalModules: ["@aws-sdk/*"],
      },
    });

    usersTable.grantReadWriteData(handler);
    postsTable.grantReadWriteData(handler);

    const api = new GraphqlApi(this, "Api", {
      name: "MiddyAppsyncExampleE2E",
      definition: Definition.fromFile(path.join(exampleRoot, "src/schema/schema.graphql")),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: Expiration.after(Duration.days(7)),
          },
        },
      },
      logConfig: {
        excludeVerboseContent: false,
        fieldLogLevel: FieldLogLevel.ALL,
        retention: RetentionDays.ONE_DAY,
      },
      xrayEnabled: false,
    });

    const lambdaDs = api.addLambdaDataSource("LambdaDs", handler);

    new MiddyAppsyncGraphQLResolvers(this, "Resolvers", {
      api,
      resolvers: [...resolvers],
      dataSource: lambdaDs,
    });

    new CfnOutput(this, "GraphQLUrl", { value: api.graphqlUrl });
    new CfnOutput(this, "ApiKey", { value: api.apiKey ?? "" });
    new CfnOutput(this, "Region", { value: this.region });
    new CfnOutput(this, "UsersTableName", { value: usersTable.tableName });
    new CfnOutput(this, "PostsTableName", { value: postsTable.tableName });
  }
}
