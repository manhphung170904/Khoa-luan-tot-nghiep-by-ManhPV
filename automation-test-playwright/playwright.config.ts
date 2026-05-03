import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { env } from "./config/env";
import { playwrightOutputDir, runtimePaths } from "./config/paths";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./config/global-setup.ts",
  globalTeardown: "./config/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: env.retryPolicy.ui,
  workers: process.env.CI ? 2 : env.workers,
  timeout: 60_000,
  expect: {
    timeout: env.expectTimeout
  },
  reporter: [
    ["html", { open: "never", outputFolder: runtimePaths.htmlReportDir }],
    ["list"],
    ["junit", { outputFile: runtimePaths.junitReportFile }]
  ],
  outputDir: playwrightOutputDir,
  use: {
    baseURL: env.baseUrl,
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: env.actionTimeout,
    navigationTimeout: env.navigationTimeout
  },
  projects: [
    {
      name: "e2e",
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      retries: env.retryPolicy.e2e,
      use: {
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "api",
      testMatch: /.*\.api\.spec\.ts/,
      retries: env.retryPolicy.api,
      use: {
        baseURL: env.baseUrl,
        extraHTTPHeaders: {
          Accept: "application/json"
        },
        trace: "off",
        screenshot: "off",
        video: "off"
      }
    }
  ],
  metadata: {
    project: "MoonNest Playwright Automation",
    baseUrl: env.baseUrl,
    framework: "Playwright + TypeScript",
    environment: env.appEnv,
    runId: runtimePaths.runId,
    outputDir: path.normalize(playwrightOutputDir)
  }
});
