import { mkdir, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

export const DEFAULT_OUTPUT_FILENAME = "middy-appsync.ts";

/**
 * Checks whether a path points to an existing directory.
 */
const isExistingDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Determines whether a path looks like a directory (no file extension or
 * ends with a path separator) versus a file path.
 */
const isDirectoryLike = (path: string): boolean => {
  return path.endsWith("/") || path.endsWith("\\") || extname(path) === "";
};

/**
 * Resolves the output file path from user input.
 *
 * - If the path is an existing directory or looks like one, appends the default filename.
 * - If the path has a file extension, it is treated as a full file path.
 *
 * @throws {Error} If the resolved path has no `.ts` extension.
 */
export const resolveOutputPath = async (output: string): Promise<string> => {
  const resolved = resolve(output);
  const isExisting = await isExistingDirectory(resolved);

  if (isExisting || isDirectoryLike(resolved)) {
    return resolve(resolved, DEFAULT_OUTPUT_FILENAME);
  }

  return resolved;
};

/**
 * Ensures the parent directory of the given file path exists,
 * creating intermediate directories as needed.
 */
export const ensureOutputDirectory = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
};
