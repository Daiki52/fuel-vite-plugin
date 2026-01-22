import { promises as fs, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, ResolvedConfig, UserConfig } from "vite";


export type FuelViteConfigOptions = {
  /** Vite command override (defaults to Vite env command). */
  command?: "build" | "serve";
  /** FuelPHP project root directory (defaults to process.cwd()). */
  rootDir?: string;
  /** Public directory name relative to the root (default: "public"). */
  publicDirectory?: string;
  /** Build output directory relative to publicDirectory (default: "build"). */
  buildDirectory?: string;
  /** Entry points relative to rootDir (required). */
  input: string[];
  /** Hot file path relative to rootDir (default: `${publicDirectory}/hot`). */
  hotFile?: string;
};

type FuelConfigMeta = {
  hotFilePath: string;
  rootDir: string;
};

/**
 * Build a Vite configuration tailored for FuelPHP + Inertia.
 */
const buildConfig = ({
  command,
  rootDir = process.cwd(),
  publicDirectory = "public",
  buildDirectory = "build",
  input,
  hotFile,
}: FuelViteConfigOptions): UserConfig & { __fuel: FuelConfigMeta } => {
  const hotFilePath = resolve(rootDir, hotFile ?? `${publicDirectory}/hot`);
  const basePath = buildDirectory.replace(/^\/+|\/+$/g, "");
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("fuel-vite-plugin: input is required and must be a non-empty array.");
  }

  return {
    root: rootDir,
    base: command === "build" ? `/${basePath}/` : "/",
    publicDir: resolve(rootDir, publicDirectory),
    build: {
      manifest: "manifest.json",
      rollupOptions: {
        input: input.map((entry) => resolve(rootDir, entry)),
      },
      outDir: resolve(rootDir, publicDirectory, buildDirectory),
      emptyOutDir: true,
    },
    __fuel: {
      hotFilePath,
      rootDir,
    },
  };
};

/**
 * FuelPHP-specific Vite plugin for resolving resources and hotfile handling.
 */
const fuelViteConfig = (options: FuelViteConfigOptions): Plugin => ({
  name: "fuel-vite-plugin",
  config(_, env) {
    const command = options.command ?? env.command;
    return buildConfig({ ...options, command });
  },
  async configureServer(server) {
    const fuelConfig = server.config as ResolvedConfig & { __fuel?: FuelConfigMeta };
    const hotFilePath = fuelConfig.__fuel?.hotFilePath ?? resolve(process.cwd(), "public", "hot");
    let cleanedUp = false;

    const writeHotFile = async () => {
      const { https, host, port, origin } = server.config.server ?? {};
      const address = server.httpServer?.address();
      const resolvedPort =
        typeof address === "object" && address?.port ? address.port : port ?? 5173;
      const resolvedHost = host === true ? "localhost" : host ?? "localhost";
      const protocol = https ? "https" : "http";
      const url =
        typeof origin === "string" && origin.trim() !== ""
          ? origin
          : `${protocol}://${resolvedHost}:${resolvedPort}`;
      await fs.mkdir(resolve(hotFilePath, ".."), { recursive: true });
      await fs.writeFile(hotFilePath, url, "utf8");
    };

    const cleanupHotFile = async () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      await fs.rm(hotFilePath, { force: true });
    };

    const cleanupHotFileSync = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      try {
        rmSync(hotFilePath, { force: true });
      } catch {
        // ignore cleanup failures on exit
      }
    };

    if (server.httpServer?.listening) {
      await writeHotFile();
    } else {
      server.httpServer?.once("listening", () => {
        writeHotFile().catch(() => {});
      });
    }

    server.httpServer?.once("close", () => {
      cleanupHotFile().catch(() => {});
    });

    const handleExit = () => {
      cleanupHotFileSync();
      process.exit(0);
    };

    process.once("SIGINT", handleExit);
  },
});

export default fuelViteConfig;
export { fuelViteConfig };
