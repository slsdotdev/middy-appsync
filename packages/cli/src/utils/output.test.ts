import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolveOutputPath, ensureOutputDirectory, DEFAULT_OUTPUT_FILENAME } from "./output.js";

describe("output utils", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "output-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("resolveOutputPath", () => {
    it("appends default filename when given an existing directory", async () => {
      const result = await resolveOutputPath(tmpDir);
      expect(result).toBe(resolve(tmpDir, DEFAULT_OUTPUT_FILENAME));
    });

    it("appends default filename when path ends with a trailing slash", async () => {
      const result = await resolveOutputPath(`${tmpDir}/generated/`);
      expect(result).toBe(resolve(tmpDir, "generated", DEFAULT_OUTPUT_FILENAME));
    });

    it("appends default filename when path has no extension", async () => {
      const result = await resolveOutputPath(`${tmpDir}/generated`);
      expect(result).toBe(resolve(tmpDir, "generated", DEFAULT_OUTPUT_FILENAME));
    });

    it("respects a full file path with extension", async () => {
      const filePath = join(tmpDir, "types.ts");
      const result = await resolveOutputPath(filePath);
      expect(result).toBe(resolve(filePath));
    });

    it("respects a custom filename in a nested path", async () => {
      const filePath = join(tmpDir, "src", "generated", "schema.ts");
      const result = await resolveOutputPath(filePath);
      expect(result).toBe(resolve(filePath));
    });

    it("resolves relative paths to absolute", async () => {
      const result = await resolveOutputPath("generated/types.ts");
      expect(result).toBe(resolve("generated/types.ts"));
    });
  });

  describe("ensureOutputDirectory", () => {
    it("creates nested directories that do not exist", async () => {
      const filePath = join(tmpDir, "a", "b", "c", "output.ts");
      await ensureOutputDirectory(filePath);

      const dirStat = await stat(join(tmpDir, "a", "b", "c"));
      expect(dirStat.isDirectory()).toBe(true);
    });

    it("does not throw if directory already exists", async () => {
      const nested = join(tmpDir, "existing");
      await mkdir(nested);

      const filePath = join(nested, "output.ts");
      await expect(ensureOutputDirectory(filePath)).resolves.toBeUndefined();
    });
  });
});
