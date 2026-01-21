import { promises as fs, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { PluginOption, ResolvedConfig, UserConfig } from "vite";

export type FuelViteConfigOptions = {
  command?: "build" | "serve";
  rootDir?: string;
  resourcesDirName?: string;
  publicDirName?: string;
  outDirName?: string;
  inputs: string[];
  hotfile?: boolean;
};

type FuelConfigMeta = {
  hotfile: boolean;
  hotFilePath: string;
  rootDir: string;
};

const buildConfig = ({
  command,
  rootDir = process.cwd(),
  resourcesDirName = "resources",
  publicDirName = "public",
  outDirName = "public/build",
  inputs,
  hotfile = true,
}: FuelViteConfigOptions): UserConfig & { __fuel: FuelConfigMeta } => {
  const resourcesDir = resolve(rootDir, resourcesDirName);
  const hotFilePath = resolve(rootDir, publicDirName, "hot");
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("fuel-vite-plugin: inputs is required and must be a non-empty array.");
  }

  return {
    root: resourcesDir,
    base: command === "build" ? "/build/" : "/",
    publicDir: resolve(resourcesDir, publicDirName),
    build: {
      manifest: "manifest.json",
      rollupOptions: {
        input: inputs.map((input) => resolve(resourcesDir, input)),
      },
      outDir: resolve(rootDir, outDirName),
      emptyOutDir: true,
    },
    __fuel: {
      hotfile,
      hotFilePath,
      rootDir,
    },
  };
};

const fuelViteConfig = (options: FuelViteConfigOptions): PluginOption => ({
  name: "fuel-vite-plugin",
  config(_, env) {
    const command = options.command ?? env.command;
    return buildConfig({ ...options, command });
  },
  async configureServer(server) {
    const fuelConfig = server.config as ResolvedConfig & { __fuel?: FuelConfigMeta };
    const hotfileEnabled = fuelConfig.__fuel?.hotfile ?? true;
    if (!hotfileEnabled) {
      return;
    }

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
