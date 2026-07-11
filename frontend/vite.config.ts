/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    env: {
      // Tests run against MSW's Node server with same-origin handlers, so the
      // client must use a relative base URL instead of the real backend host.
      VITE_API_BASE_URL: "/api/v1",
    },
  },
})
