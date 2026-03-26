import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { glob } from "tinyglobby";

export const GRAPHQL_EXTENSIONS = [".gql", ".graphql", ".graphqls"] as const;

export const GRAPHQL_GLOB = `**/*{${GRAPHQL_EXTENSIONS.join(",")}}`;

export const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
];

/**
 * Checks whether a path points to an existing directory.
 */
const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Returns true if the filename ends with a supported GraphQL extension.
 */
export const isGraphQLFile = (filePath: string): boolean => {
  const lower = filePath.toLowerCase();
  return GRAPHQL_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

/**
 * Normalizes user-supplied source paths into glob patterns that only match
 * GraphQL files. Plain directory paths are expanded with the GraphQL glob;
 * explicit file paths and existing glob patterns are passed through.
 */
export const normalizeSources = async (sources: string[]): Promise<string[]> => {
  const normalized: string[] = [];

  for (const source of sources) {
    const resolved = resolve(source);

    if (await isDirectory(resolved)) {
      normalized.push(`${resolved}/${GRAPHQL_GLOB}`);
    } else {
      normalized.push(source);
    }
  }

  return normalized;
};

/**
 * Finds and resolves source files based on the provided paths.
 * Supports glob patterns, file paths, and directory paths.
 *
 * - Directory paths are expanded to match only GraphQL files inside them.
 * - Resolved files are validated to have a supported GraphQL extension.
 * - Results are deduplicated and sorted for deterministic output.
 *
 * @throws {Error} If no GraphQL files are found after resolution.
 */
export const resolveSourcePaths = async (
  sources: string[],
  ignore: string[] = []
): Promise<string[]> => {
  if (sources.length === 0) {
    throw new Error("No source paths provided. Provide at least one path or glob pattern.");
  }

  const patterns = await normalizeSources(sources);

  const paths = await glob(patterns, {
    absolute: true,
    onlyFiles: true,
    ignore: [...DEFAULT_IGNORE_PATTERNS, ...ignore],
  });

  const graphqlPaths = paths.filter(isGraphQLFile);

  if (graphqlPaths.length === 0) {
    return [];
  }

  const unique = [...new Set(graphqlPaths)].sort();

  return unique;
};
