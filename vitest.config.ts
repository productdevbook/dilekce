import { playwright } from "@vitest/browser-playwright"
import { defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

// The pointer media features follow the machine: a Mac reports a fine pointer that hovers, headless
// Linux (CI) reports none, and the CDP touch-emulation switch falls back to that on the way out. So
// a project pins them at launch and no test depends on the machine. `pointer` and `hover` use
// Blink's enums: pointer none=1 coarse=2 fine=4, hover none=1 hover=2.
const pointer = (kind: "fine" | "coarse") =>
  `--blink-settings=${
    kind === "fine"
      ? "primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2"
      : "primaryPointerType=2,availablePointerTypes=2,primaryHoverType=1,availableHoverTypes=1"
  }`

// Real Chromium, not a simulated DOM: layout, focus, :has(), constraint
// validation and the error measurement all behave differently in jsdom.
const project = (
  name: string,
  kind: "fine" | "coarse",
  files: { include: string[]; exclude?: string[] },
) =>
  mergeConfig(
    viteConfig,
    defineConfig({
      test: {
        name,
        ...files,
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({ launchOptions: { args: [pointer(kind)] } }),
          instances: [{ browser: "chromium" }],
        },
      },
    }),
  )

export default defineConfig({
  test: {
    projects: [
      project("fine", "fine", {
        include: ["test/**/*.test.tsx"],
        exclude: ["test/touch.test.tsx"],
      }),
      project("touch", "coarse", { include: ["test/touch.test.tsx"] }),
    ],
  },
})
