import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["lib/index.ts"],
    format: ["esm"],
    dts: false,
    outDir: "dist",
    outExtension: () => ({ js: ".mjs" }),
    clean: true,
    treeshake: true,
  },
  {
    entry: ["lib/index.ts"],
    dts: { only: true },
    outDir: "dist",
  },
]);
