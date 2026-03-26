import { cac } from "cac";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url)).toString()
);

const cli = cac("middy-appsync").version(version).help();

export { cli };
