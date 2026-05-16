import { FileSystem } from "aws-cdk-lib/core";
import * as fs from "node:fs";

export const mockTemplateSource = (files: Record<string, string>) => {
  const outDir = FileSystem.mkdtemp("mock-template-source-");

  for (const [filename, content] of Object.entries(files)) {
    const filePath = `${outDir}/${filename}`;
    fs.writeFileSync(filePath, content);
  }

  return outDir;
};
