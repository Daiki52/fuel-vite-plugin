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
    external: ["vite"],
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
    external: ["axios", "laravel-precognition"],
  },
]);
