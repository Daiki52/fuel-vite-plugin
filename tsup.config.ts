import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    platform: "node",
    external: ["axios", "vite"],
  },
  {
    entry: {
      "inertia-helpers/index": "src/inertia-helpers/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    target: "es2020",
    platform: "browser",
    external: ["axios", "vite"],
  },
]);
