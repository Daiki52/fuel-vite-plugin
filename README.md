# fuel-vite-plugin

A small helper to simplify Vite configuration for FuelPHP + Vue (Inertia).
This package assumes it is used together with
[Daiki52/fuel-vue](https://github.com/daiki52/fuel-vue).

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
import { resolvePageComponent, setupFuelCsrf } from 'fuel-vite-plugin/inertia-helpers'

import { createApp, h, type DefineComponent } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'

setupFuelCsrf()

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(
            `./components/Pages/${name}.vue`,
            import.meta.glob<DefineComponent>('./components/Pages/**/*.vue'),
        ),
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .mount(el)
    }
})

```

- `setupFuelCsrf` attaches the FuelPHP CSRF token from cookies to mutating Axios requests.
- `resolvePageComponent` resolves Inertia page components from a Vite glob map.

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
