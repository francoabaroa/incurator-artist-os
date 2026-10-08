import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // Resolve Streamdown's Shiki subpaths through Vite even in paths containing '*'.
    server: { deps: { inline: ["streamdown"] } },
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
  },
});
