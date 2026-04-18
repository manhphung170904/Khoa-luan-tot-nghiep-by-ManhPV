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

    await Promise.all(staleRuns.map((run) => fs.rm(run.fullPath, { recursive: true, force: true })));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Keep top-level reports fresh each run so local debugging stays tidy.
  await Promise.all([
    fs.rm(path.resolve(runtimePaths.htmlReportDir), { recursive: true, force: true }),
    fs.rm(path.resolve(path.dirname(runtimePaths.junitReportFile)), { recursive: true, force: true })
  ]);

  await Promise.all(
    directories.map((directory) => fs.mkdir(path.resolve(directory), { recursive: true }))
  );

  await fs.mkdir(runtimeRoot, { recursive: true });
  await pruneHistoricalRuns();
}
