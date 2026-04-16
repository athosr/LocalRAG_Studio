import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["pg"],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          // Electron loads preload outside an ES module graph; CJS avoids
          // "Cannot use import statement outside a module" for index.mjs.
          format: "cjs",
          inlineDynamicImports: true,
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
  },
});
