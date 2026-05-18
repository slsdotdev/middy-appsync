import { App } from "aws-cdk-lib";
import { ExampleStack } from "../lib/stack.js";

const app = new App();

new ExampleStack(app, "MiddyAppsyncExampleE2E", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
