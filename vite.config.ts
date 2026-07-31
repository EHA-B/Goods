import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rendererRoot = path.resolve(__dirname, "src/renderer");

export default defineConfig({
  root: rendererRoot,
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: path.resolve(__dirname, "electron/main.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron/main"),
            emptyOutDir: true,
            rollupOptions: {
              external: ["knex", "sqlite3", "bcrypt", "electron"],
            },
          },
        },
      },
      preload: {
        input: path.resolve(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron/preload"),
            emptyOutDir: true,
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
      renderer: process.env.NODE_ENV === "test" ? undefined : {},
    }),
  ],
  resolve: {
    alias: {
      "@": rendererRoot,
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(rendererRoot, "index.html"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  clearScreen: false,
});
