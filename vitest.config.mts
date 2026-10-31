import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.ts"],
    // test/ needs the database and takes minutes: run it with npm run test:isolation.
    exclude: ["node_modules/**", ".next/**", "test/**"],
  },
});
