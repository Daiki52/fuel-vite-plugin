# fuel-vite-plugin

A small helper to simplify Vite configuration for FuelPHP + Vue (Inertia).

## Usage

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fuelViteConfig from "fuel-vite-plugin";

export default defineConfig({
  plugins: [
    vue(),
    fuelViteConfig({
      rootDir: __dirname,
      inputs: ["src/main.ts", "src/app.ts"],
    }),
  ],
});
```

## Inertia helpers

```ts
import { setupFuelCsrf, resolvePageComponent } from "fuel-vite-plugin/inertia-helpers";
```

`setupFuelCsrf` attaches the FuelPHP CSRF token from cookies to mutating Axios requests.
`resolvePageComponent` resolves Inertia page components from a Vite glob map.

## Options

- `rootDir`: FuelPHP project root directory
- `resourcesDirName`: resources directory name (default: `resources`)
- `publicDirName`: public directory name (default: `public`)
- `outDirName`: build output directory (default: `public/build`)
- `inputs`: entry point array (required)
- `command`: set Vite command explicitly (`build`/`serve`)
- `hotfile`: write `public/hot` on dev server start (default: `true`)

## Build

```bash
npm run build
```

Build outputs are split by environment:
- `dist/index.js` for Node.js
- `dist/inertia-helpers/index.js` for browsers
