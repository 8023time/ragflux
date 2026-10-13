import { defineConfig } from "tsup";

const entries = [
  "lib/auth/index.ts",
  "lib/model/index.ts",
  "lib/dataset/index.ts",
  "lib/document/index.ts",
  "lib/chunk/index.ts",
  "lib/retrieval/index.ts",
  "lib/session/index.ts",
];

export default defineConfig([
  {
    entry: entries,
    format: ["esm"],
    dts: false,
    outDir: "dist",
    outExtension: () => ({ js: ".mjs" }),
    clean: true,
    splitting: false,
    treeshake: true,
  },
  {
    entry: entries,
    dts: { only: true },
    outDir: "dist",
  },
]);
