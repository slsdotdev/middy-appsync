import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const outputsPath = path.join(packageRoot, "cdk.out", "outputs.json");
const stackName = "MiddyAppsyncExampleE2E";

function loadOutputs() {
  if (!existsSync(outputsPath)) {
    throw new Error(`Stack outputs not found at ${outputsPath}`);
  }
  const parsed = JSON.parse(readFileSync(outputsPath, "utf8"));
  const stack = parsed[stackName];
  if (!stack) {
    throw new Error(`Stack "${stackName}" not present in outputs.json`);
  }
  return stack as Record<string, string>;
}

function exportOutputs(outputs: Record<string, string>) {
  process.env.GRAPHQL_URL = outputs.GraphQLUrl;
  process.env.API_KEY = outputs.ApiKey;
  process.env.USERS_TABLE = outputs.UsersTableName;
  process.env.POSTS_TABLE = outputs.PostsTableName;
  process.env.AWS_REGION ??= outputs.Region;
}

export default async function setup() {
  const skipDeploy = process.env.SKIP_DEPLOY === "1";

  if (!skipDeploy) {
    execSync(
      `npx cdk deploy ${stackName} --require-approval never --outputs-file cdk.out/outputs.json`,
      { cwd: packageRoot, stdio: "inherit" }
    );
  }

  exportOutputs(loadOutputs());

  return async () => {
    if (skipDeploy) return;
    execSync(`npx cdk destroy ${stackName} --force --outputs-file cdk.out/outputs.json`, {
      cwd: packageRoot,
      stdio: "inherit",
    });
  };
}
