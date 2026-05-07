import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @sd-creation-wizard/api run dev",
      port: 3007,
      reuseExistingServer: !process.env["CI"],
      cwd: "../..",
    },
    {
      command: "pnpm --filter @sd-creation-wizard/wizard run dev",
      port: 5173,
      reuseExistingServer: !process.env["CI"],
      cwd: "../..",
    },
  ],
});
