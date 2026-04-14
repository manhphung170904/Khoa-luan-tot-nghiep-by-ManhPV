import fs from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { env } from "./env";
import { runtimePaths } from "./paths";

const directories = [
  env.authStateDir,
  runtimePaths.artifactsRootDir,
  path.dirname(runtimePaths.junitReportFile),
  runtimePaths.htmlReportDir
];

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await Promise.all(
    directories.map((directory) => fs.mkdir(path.resolve(directory), { recursive: true }))
  );
}
