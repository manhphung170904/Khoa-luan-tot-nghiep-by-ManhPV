import fs from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { runtimePaths } from "./paths";

const runtimeRoot = path.resolve(runtimePaths.rootDir);
const directories = [
  runtimePaths.rootDir,
  runtimePaths.artifactsRootDir,
  path.dirname(runtimePaths.junitReportFile),
  runtimePaths.htmlReportDir
];

async function safeRemoveDirectory(targetPath: string, label: string): Promise<void> {
  try {
    await fs.rm(path.resolve(targetPath), { recursive: true, force: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EBUSY") {
      console.warn(`[Global Setup] Skip removing ${label} because files are in use.`);
      return;
    }

    throw error;
  }
}

async function pruneHistoricalRuns(keepLatest = 5): Promise<void> {
  const artifactsRoot = path.resolve(runtimePaths.artifactsRootDir);

  try {
    const entries = await fs.readdir(artifactsRoot, { withFileTypes: true });
    const runs = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const fullPath = path.join(artifactsRoot, entry.name);
          const stats = await fs.stat(fullPath);
          return { fullPath, mtimeMs: stats.mtimeMs };
        })
    );

    const staleRuns = runs
      .sort((left, right) => right.mtimeMs - left.mtimeMs)
      .slice(keepLatest);

    await Promise.all(
      staleRuns.map((run, index) => safeRemoveDirectory(run.fullPath, `historical test-results run #${index + 1}`))
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Keep top-level reports fresh each run so local debugging stays tidy.
  await Promise.all([
    safeRemoveDirectory(runtimePaths.htmlReportDir, "HTML report"),
    safeRemoveDirectory(path.dirname(runtimePaths.junitReportFile), "JUnit report")
  ]);

  await Promise.all(
    directories.map((directory) => fs.mkdir(path.resolve(directory), { recursive: true }))
  );

  await fs.mkdir(runtimeRoot, { recursive: true });
  await pruneHistoricalRuns();
}
