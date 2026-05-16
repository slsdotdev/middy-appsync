import { parse } from "comment-parser";
import * as path from "node:path";
import * as fs from "node:fs";
import { globSync } from "tinyglobby";

export const DEFAULT_MAX_BATCH_SIZE = 100;
export const TEMPLATE_FILE_EXTENSIONS = ["ts", "mjs", "js"] as const;
export const TEMPLATE_IGNORE_PATTERN = "**/*.{d,spec,test}.{ts,js,mjs}";
/**
 * Regex to match field resolver template files, which must be named in the format `{typeName}.{fieldName}.ts` (e.g. `Query.getUser.ts`, `User.name.ts`, etc.). The regex captures the typeName and fieldName as groups.
 *
 * Alphanumeric characters and underscores are allowed in type and field names, but dots are not (except for the separator between type and field).
 */
export const FIELD_TEMPLATE_REGEX = /^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.(ts|js|mjs)$/;

/**
 * Regex to match pipeline function template files, which must be named in the format `{functionName}.ts` (e.g. `transformUser.ts`, `validateInput.ts`, etc.). The regex captures the functionName as a group.
 *
 * Alphanumeric characters and underscores are allowed in function names, but dots are not (except for the separator between function name and extension).
 */
export const PIPELINE_FUNCTION_REGEX = /^([a-zA-Z0-9_]+)\.(ts|js|mjs)$/;

export const parseOptionsFromDocComment = (sourceCode: string) => {
  const parsed = parse(sourceCode);

  if (parsed.length === 0) {
    return {
      dataSource: null,
      pipeline: [],
    };
  }

  const dsTag = parsed[0].tags.find((tag) => tag.tag === "dataSource");
  const pipelineTag = parsed[0].tags.find((tag) => tag.tag === "pipeline");

  const dataSource = dsTag?.name || dsTag?.description || null;
  const pipeline = ((pipelineTag?.name ?? "") + (pipelineTag?.description ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    dataSource: dataSource,
    pipeline: pipeline,
  };
};

export interface FieldResolverInfo {
  typeName: string;
  fieldName: string;
  dataSource: string | null;
  pipeline: string[];
  sourcePath: string;
}

export function parseFieldResolverInfo(sourcePath: string): FieldResolverInfo | null {
  const fileName = path.basename(sourcePath, path.extname(sourcePath));
  const parts = fileName.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const sourceCode = fs.readFileSync(sourcePath, "utf-8");
  const options = parseOptionsFromDocComment(sourceCode);

  return {
    typeName: parts[0],
    fieldName: parts[1],
    sourcePath,
    ...options,
  };
}

export interface PipelineFunctionInfo {
  name: string;
  dataSource: string | null;
  pipeline: string[];
  sourcePath: string;
}

export function parsePipelineFunctionInfo(sourcePath: string): PipelineFunctionInfo | null {
  const fileName = path.basename(sourcePath, path.extname(sourcePath));
  const parts = fileName.split(".");

  if (parts.length !== 1) {
    return null;
  }

  const sourceCode = fs.readFileSync(sourcePath, "utf-8");
  const options = parseOptionsFromDocComment(sourceCode);

  return {
    name: parts[0],
    sourcePath,
    ...options,
  };
}

export const resolveTemplateSources = (sourcePaths: string[]) => {
  const sources: string[] = [];

  for (const sourcePath of sourcePaths) {
    let source = path.resolve(sourcePath);

    if (!fs.existsSync(source)) {
      throw new Error(`Template source file not found: ${source}`);
    }

    if (fs.statSync(source).isDirectory()) {
      source = path.join(source, "**/*.{ts,js,mjs}");
    }

    sources.push(source);
  }

  const matches = globSync(sources, {
    absolute: true,
    onlyFiles: true,
    ignore: TEMPLATE_IGNORE_PATTERN,
  });

  return matches;
};

export function resolveTemplates(sourcePaths: string[]) {
  const fieldResolvers: FieldResolverInfo[] = [];
  const pipelineFunctions: PipelineFunctionInfo[] = [];

  const templateSources = resolveTemplateSources(sourcePaths);

  if (!templateSources.length) {
    return {
      fieldResolvers,
      pipelineFunctions,
    };
  }

  for (const sourcePath of templateSources) {
    if (FIELD_TEMPLATE_REGEX.test(path.basename(sourcePath))) {
      const info = parseFieldResolverInfo(sourcePath);

      if (info) {
        fieldResolvers.push(info);
      }

      continue;
    }

    if (PIPELINE_FUNCTION_REGEX.test(path.basename(sourcePath))) {
      const info = parsePipelineFunctionInfo(sourcePath);

      if (info) {
        pipelineFunctions.push(info);
      }

      continue;
    }

    throw new Error(
      `Template file "${path.basename(
        sourcePath
      )}" does not match expected naming conventions for field resolvers or pipeline functions. ` +
        `Field resolver templates must be named "{TypeName}.{fieldName}.{ts|js|mjs}" and pipeline function templates must be named "{functionName}.{ts|js|mjs}".`
    );
  }

  return {
    fieldResolvers,
    pipelineFunctions,
  };
}

export interface BuildFieldResolverInfo extends FieldResolverInfo {
  buildPath: string;
}

export interface BuildPipelineFunctionInfo extends PipelineFunctionInfo {
  buildPath: string;
}
