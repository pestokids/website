import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "internal/**"],
    // convex-test and Convex components ship TypeScript that uses
    // import.meta.glob, so Vitest has to transform them. Convex tests opt into
    // the edge-runtime environment per file.
    server: { deps: { inline: ["convex-test", /@convex-dev\//] } },
  },
});
