import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import packageJson from "./package.json"

// biome-ignore lint/style/noDefaultExport: Vite requires a default configuration export.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    css: true,
    restoreMocks: true,
  },
})
