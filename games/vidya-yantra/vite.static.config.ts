import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

function removeHostedOnlyHead(): Plugin {
  return {
    name: "remove-hosted-only-head",
    transformIndexHtml(html) {
      return html
        .replace(/\s*<link rel="preload" as="image" href="\/manus-storage\/[^"]+" \/>/g, "")
        .replace(/\s*<link rel="icon" href="\/manus-storage\/[^"]+" \/>/g, "")
        .replace(/\s*<script defer src="%VITE_ANALYTICS_ENDPOINT%\/umami"[^>]*><\/script>/g, "");
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const root = path.resolve(import.meta.dirname);

  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [react(), tailwindcss(), removeHostedOnlyHead()],
    resolve: {
      alias: {
        "@": path.resolve(root, "client", "src"),
        "@shared": path.resolve(root, "shared"),
        "@assets": path.resolve(root, "attached_assets"),
      },
    },
    envDir: root,
    root: path.resolve(root, "client"),
    build: {
      outDir: path.resolve(root, "dist", "static"),
      emptyOutDir: true,
    },
  };
});
