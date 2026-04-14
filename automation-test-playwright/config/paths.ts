import path from "node:path";

const sanitizeRunId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, "-");

const defaultRunId = new Date().toISOString().replace(/[:.]/g, "-");

export const runtimePaths = {
  runId: sanitizeRunId(process.env.PW_RUN_ID ?? defaultRunId),
  artifactsRootDir: path.join("artifacts", "test-results"),
  htmlReportDir: "playwright-report",
  junitReportFile: path.join("reports", "junit", "results.xml"),
  authStateDir: path.join("playwright", ".auth")
};

export const playwrightOutputDir = path.join(runtimePaths.artifactsRootDir, runtimePaths.runId);
