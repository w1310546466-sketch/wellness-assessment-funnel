import { defineConfig, devices } from "@playwright/test";

const useSystemEdge = process.env.PLAYWRIGHT_USE_SYSTEM_EDGE === "1" || process.platform === "win32";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      APP_DATA_MODE: "memory"
    }
  },
  projects: [
    {
      name: useSystemEdge ? "msedge" : "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(useSystemEdge ? { channel: "msedge" } : {})
      }
    }
  ]
});
