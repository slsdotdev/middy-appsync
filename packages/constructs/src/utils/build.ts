import { buildSync } from "esbuild";
import * as path from "node:path";

export function buildSources(paths: string[], outDir: string) {
  const buildResult = buildSync({
    entryPoints: paths,
    outdir: outDir,
    target: "esnext",
    sourcemap: "inline",
    sourcesContent: false,
    treeShaking: true,
    platform: "node",
    format: "esm",
    minify: false,
    bundle: true,
    write: true,
    external: ["@aws-appsync/utils"],
  });

  if (buildResult.errors.length > 0) {
    throw new Error(
      `Failed to bundle resolver templates:\n${buildResult.errors.map((e) => e.text).join("\n")}`
    );
  }

  return paths.map((p) => {
    const fileName = path.basename(p, path.extname(p));
    return path.resolve(outDir, `${fileName}.js`);
  });
}
