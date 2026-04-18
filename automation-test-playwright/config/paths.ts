import path from "node:path";

const sanitizeRunId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, "-");

const defaultRunId = new Date().toISOString().replace(/[:.]/g, "-");

export const runtimePaths = {
  runId: sanitizeRunId(process.env.PW_RUN_ID ?? defaultRunId),
  rootDir: ".runtime",
  artifactsRootDir: path.join(".runtime", "test-results"),
  htmlReportDir: path.join(".runtime", "playwright-report"),
  junitReportFile: path.join(".runtime", "reports", "junit", "results.xml")
};

export const playwrightOutputDir = path.join(runtimePaths.artifactsRootDir, runtimePaths.runId);
