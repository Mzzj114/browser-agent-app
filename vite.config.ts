import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// biome-ignore lint/style/noDefaultExport: Vite requires a default configuration export.
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    css: true,
    restoreMocks: true,
  },
})
