// Build for the claude.ai preview page: sample data, no service worker, relative paths
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
export default defineConfig({
  root: resolve(__dirname, ".."),
  base: "./",
  define: { __PREVIEW_BUILD__: JSON.stringify(Date.now()) },
  plugins: [react()],
  build: { outDir: "/tmp/gp-preview", emptyOutDir: true, rollupOptions: { input: resolve(__dirname, "../preview.html") } },
});
