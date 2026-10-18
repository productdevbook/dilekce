import { playwright } from "@vitest/browser-playwright"
import { defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

// Real Chromium, not a simulated DOM: layout, focus, :has(), constraint
// validation and the error measurement all behave differently in jsdom.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["test/**/*.test.tsx"],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
      },
    },
  }),
)
