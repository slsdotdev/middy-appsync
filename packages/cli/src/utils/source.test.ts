import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveSourcePaths,
  normalizeSources,
  isGraphQLFile,
  GRAPHQL_EXTENSIONS,
  GRAPHQL_GLOB,
} from "./source.js";

describe("source utils", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "source-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("isGraphQLFile", () => {
    it.each(GRAPHQL_EXTENSIONS)("returns true for %s extension", (ext) => {
      expect(isGraphQLFile(`schema${ext}`)).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(isGraphQLFile("schema.GRAPHQL")).toBe(true);
    });

    it("returns false for non-graphql files", () => {
      expect(isGraphQLFile("schema.ts")).toBe(false);
      expect(isGraphQLFile("schema.json")).toBe(false);
    });
  });

  describe("normalizeSourcePaths", () => {
    it("appends graphql glob to directory paths", async () => {
      const result = await normalizeSources([tmpDir]);
      expect(result[0]).toContain(GRAPHQL_GLOB);
    });

    it("passes through glob patterns unchanged", async () => {
      const pattern = "src/**/*.graphql";
      const result = await normalizeSources([pattern]);
      expect(result).toEqual([pattern]);
    });

    it("passes through file paths unchanged", async () => {
      const filePath = join(tmpDir, "schema.graphql");
      await writeFile(filePath, "type Query { hello: String }");
      // A file path (not a directory) should not be expanded
      const result = await normalizeSources([filePath]);
      expect(result[0]).not.toContain(GRAPHQL_GLOB);
    });
  });

  describe("resolveSourcePaths", () => {
    it("throws when no sources are provided", async () => {
      await expect(resolveSourcePaths([])).rejects.toThrow("No source paths provided");
    });

    it("resolves empty when no graphql files are found", async () => {
      await writeFile(join(tmpDir, "readme.md"), "# Hello");
      await expect(resolveSourcePaths([tmpDir])).resolves.toEqual([]);
    });

    it("resolves graphql files from a directory", async () => {
      await writeFile(join(tmpDir, "schema.graphql"), "type Query { hello: String }");
      await writeFile(join(tmpDir, "types.gql"), "type User { name: String }");
      await writeFile(join(tmpDir, "other.ts"), "export {}");

      const result = await resolveSourcePaths([tmpDir]);

      expect(result).toHaveLength(2);
      expect(result.every((p) => isGraphQLFile(p))).toBe(true);
    });

    it("resolves graphql files from nested directories", async () => {
      const nested = join(tmpDir, "nested");
      await mkdir(nested, { recursive: true });
      await writeFile(join(nested, "schema.graphql"), "type Query { hello: String }");

      const result = await resolveSourcePaths([tmpDir]);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain("nested");
    });

    it("resolves files from glob patterns", async () => {
      await writeFile(join(tmpDir, "a.graphql"), "type A { id: ID }");
      await writeFile(join(tmpDir, "b.graphql"), "type B { id: ID }");

      const result = await resolveSourcePaths([`${tmpDir}/*.graphql`]);

      expect(result).toHaveLength(2);
    });

    it("returns sorted and deduplicated results", async () => {
      await writeFile(join(tmpDir, "b.graphql"), "type B { id: ID }");
      await writeFile(join(tmpDir, "a.graphql"), "type A { id: ID }");

      const result = await resolveSourcePaths([tmpDir, `${tmpDir}/*.graphql`]);

      expect(result).toStrictEqual([...result].sort());
      expect(new Set(result).size).toBe(result.length);
    });

    it("respects custom ignore patterns", async () => {
      const ignored = join(tmpDir, "ignored");
      await mkdir(ignored, { recursive: true });
      await writeFile(join(ignored, "schema.graphql"), "type Query { hello: String }");
      await writeFile(join(tmpDir, "keep.graphql"), "type Keep { id: ID }");

      const result = await resolveSourcePaths([tmpDir], [`${ignored}/**`]);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain("keep.graphql");
    });

    it("resolves .graphqls files", async () => {
      await writeFile(join(tmpDir, "schema.graphqls"), "type Query { hello: String }");

      const result = await resolveSourcePaths([tmpDir]);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain(".graphqls");
    });
  });
});
