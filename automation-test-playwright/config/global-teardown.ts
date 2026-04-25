import type { FullConfig } from "@playwright/test";
import { MySqlDbClient } from "../utils/db/MySqlDbClient";
import { cleanupDatabaseScope } from "../utils/db/TestDataCleanup";
import fs from "node:fs/promises";
import path from "node:path";
import { runtimePaths } from "./paths";

const moonNestRoot = path.resolve(process.cwd(), "..", "moonNest-main");
const runToken = runtimePaths.runId
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "")
  .slice(-8)
  .padStart(8, "0");
const allowLegacyPrefixSweep = process.env.ALLOW_LEGACY_PREFIX_SWEEP === "true";
const allowUploadPatternSweep = process.env.ALLOW_UPLOAD_PATTERN_SWEEP === "true";

const uploadCleanupTargets = [
  {
    label: "building image (test)",
    dir: path.resolve(moonNestRoot, "target", "test-upload", "building_img"),
    sweepAllMatchingFiles: allowUploadPatternSweep,
    dbColumn: "image",
    sql: `
      SELECT image AS filename
      FROM building
      WHERE LOWER(name) LIKE ?
        AND image IS NOT NULL
        AND TRIM(image) <> ''
    `,
    sqlParams: [`%${runToken}%`],
    allowedPattern: /^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  },
  {
    label: "planning map image (test)",
    dir: path.resolve(moonNestRoot, "target", "test-upload", "planning_map_img"),
    sweepAllMatchingFiles: allowUploadPatternSweep,
    dbColumn: "image_url",
    sql: `
      SELECT image_url AS filename
      FROM planning_map
      WHERE building_id IN (SELECT id FROM building WHERE LOWER(name) LIKE ?)
        AND image_url IS NOT NULL
        AND TRIM(image_url) <> ''
    `,
    sqlParams: [`%${runToken}%`],
    allowedPattern: /^planning_[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  },
  {
    label: "building image (local)",
    dir: path.resolve(moonNestRoot, "uploads", "building_img"),
    sweepAllMatchingFiles: false,
    dbColumn: "image",
    sql: `
      SELECT image AS filename
      FROM building
      WHERE LOWER(name) LIKE ?
        AND image IS NOT NULL
        AND TRIM(image) <> ''
    `,
    sqlParams: [`%${runToken}%`],
    allowedPattern: /^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  },
  {
    label: "planning map image (local)",
    dir: path.resolve(moonNestRoot, "uploads", "planning_map_img"),
    sweepAllMatchingFiles: false,
    dbColumn: "image_url",
    sql: `
      SELECT image_url AS filename
      FROM planning_map
      WHERE building_id IN (SELECT id FROM building WHERE LOWER(name) LIKE ?)
        AND image_url IS NOT NULL
        AND TRIM(image_url) <> ''
    `,
    sqlParams: [`%${runToken}%`],
    allowedPattern: /^planning_[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  }
] as const;

function extractFilename(rawValue: string): string | null {
  const normalized = rawValue.trim().replace(/\\/g, "/");
  if (!normalized) {
    return null;
  }

  const filename = path.posix.basename(normalized);
  if (!filename || filename === "." || filename === "..") {
    return null;
  }

  return filename;
}

async function collectUploadedTestFiles(): Promise<Array<{ filePath: string; label: string }>> {
  const pendingDeletes = new Map<string, { filePath: string; label: string }>();

  for (const target of uploadCleanupTargets) {
    const rows = await MySqlDbClient.query<Record<typeof target.dbColumn, string>>(target.sql, [...target.sqlParams]);

    for (const row of rows) {
      const rawValue = row[target.dbColumn];
      if (typeof rawValue !== "string") {
        continue;
      }

      const filename = extractFilename(rawValue);
      if (!filename || !target.allowedPattern.test(filename)) {
        continue;
      }

      const resolvedPath = path.resolve(target.dir, filename);
      if (path.dirname(resolvedPath) !== target.dir) {
        continue;
      }

      pendingDeletes.set(resolvedPath, {
        filePath: resolvedPath,
        label: `${target.label} ${filename}`
      });
    }

    if (!target.sweepAllMatchingFiles) {
      continue;
    }

    let filenames: string[] = [];
    try {
      filenames = await fs.readdir(target.dir);
    } catch {
      continue;
    }

    for (const filename of filenames) {
      if (!target.allowedPattern.test(filename)) {
        continue;
      }

      const resolvedPath = path.resolve(target.dir, filename);
      if (path.dirname(resolvedPath) !== target.dir) {
        continue;
      }

      pendingDeletes.set(resolvedPath, {
        filePath: resolvedPath,
        label: `${target.label} ${filename}`
      });
    }
  }

  return [...pendingDeletes.values()];
}

async function cleanupUploadedTestFiles(): Promise<void> {
  const filesToDelete = await collectUploadedTestFiles();

  if (filesToDelete.length === 0) {
    console.log("[Global Teardown] No uploaded test files found in whitelisted directories.");
    return;
  }

  let deletedCount = 0;
  for (const file of filesToDelete) {
    try {
      await fs.rm(file.filePath, { force: true });
      deletedCount += 1;
    } catch (error) {
      console.warn(`[Global Teardown] Failed to delete ${file.label}:`, error);
    }
  }

  console.log(`[Global Teardown] Deleted ${deletedCount}/${filesToDelete.length} uploaded test file(s).`);
}

type SweepScope = {
  buildingIds: number[];
  customerIds: number[];
  staffIds: number[];
  emails: string[];
};

async function collectSweepScope(): Promise<SweepScope> {
  const buildingWhere = allowLegacyPrefixSweep
    ? `
      LOWER(name) LIKE ?
      OR name LIKE 'PW Building %'
      OR tax_code LIKE 'PW-%'
    `
    : "LOWER(name) LIKE ?";
  const buildingParams = allowLegacyPrefixSweep ? [`%${runToken}%`] : [`%${runToken}%`];

  const buildingRows = await MySqlDbClient.query<{ id: number }>(
    `
      SELECT id
      FROM building
      WHERE ${buildingWhere}
    `,
    buildingParams
  );

  const customerWhere = allowLegacyPrefixSweep
    ? `
      LOWER(full_name) LIKE ?
      OR LOWER(username) LIKE ?
      OR LOWER(email) LIKE ?
      OR full_name LIKE 'PW Customer %'
      OR username LIKE 'pwcust%'
      OR username LIKE 'e2e_register%'
      OR email LIKE 'pw-customer-%@example.com'
      OR email LIKE 'e2e_register%@example.com'
    `
    : `
      LOWER(full_name) LIKE ?
      OR LOWER(username) LIKE ?
      OR LOWER(email) LIKE ?
    `;
  const runParams = [`%${runToken}%`, `%${runToken}%`, `%${runToken}%`];

  const customerRows = await MySqlDbClient.query<{ id: number; email: string | null }>(
    `
      SELECT id, email
      FROM customer
      WHERE ${customerWhere}
    `,
    runParams
  );

  const staffWhere = allowLegacyPrefixSweep
    ? `
      LOWER(full_name) LIKE ?
      OR LOWER(username) LIKE ?
      OR LOWER(email) LIKE ?
      OR full_name LIKE 'PW %'
      OR email LIKE 'pw-%@example.com'
    `
    : `
      LOWER(full_name) LIKE ?
      OR LOWER(username) LIKE ?
      OR LOWER(email) LIKE ?
    `;

  const staffRows = await MySqlDbClient.query<{ id: number; email: string | null }>(
    `
      SELECT id, email
      FROM staff
      WHERE ${staffWhere}
    `,
    runParams
  );

  const verificationWhere = allowLegacyPrefixSweep
    ? `
      LOWER(email) LIKE ?
      OR email LIKE 'pw-%@example.com'
      OR email LIKE 'e2e_register%@example.com'
    `
    : "LOWER(email) LIKE ?";
  const verificationParams = allowLegacyPrefixSweep ? [`%${runToken}%`] : [`%${runToken}%`];

  const verificationRows = await MySqlDbClient.query<{ email: string }>(
    `
      SELECT DISTINCT email
      FROM email_verification
      WHERE ${verificationWhere}
    `,
    verificationParams
  );

  const emails = [
    ...customerRows.map((row) => row.email ?? "").filter(Boolean),
    ...staffRows.map((row) => row.email ?? "").filter(Boolean),
    ...verificationRows.map((row) => row.email)
  ];

  return {
    buildingIds: buildingRows.map((row) => row.id),
    customerIds: customerRows.map((row) => row.id),
    staffIds: staffRows.map((row) => row.id),
    emails
  };
}

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log("\n[Global Teardown] Starting test data sweep...");
  console.log(`[Global Teardown] Run ownership token: ${runToken}`);
  if (allowLegacyPrefixSweep) {
    console.warn("[Global Teardown] Legacy prefix sweep is enabled. This may remove old PW-prefixed test data.");
  }

  try {
    await cleanupUploadedTestFiles();

    const scope = await collectSweepScope();

    if (
      scope.buildingIds.length === 0 &&
      scope.customerIds.length === 0 &&
      scope.staffIds.length === 0 &&
      scope.emails.length === 0
    ) {
      console.log("[Global Teardown] No orphaned test data found.");
      return;
    }

    console.log(
      `[Global Teardown] Cleaning up: ${scope.buildingIds.length} building(s), ${scope.customerIds.length} customer(s), ${scope.staffIds.length} staff member(s), ${scope.emails.length} verification email bucket(s).`
    );

    await cleanupDatabaseScope(scope, { logPrefix: "[Global Teardown]", log: true });

    console.log("[Global Teardown] Cleanup completed successfully.");
  } catch (error) {
    console.error("[Global Teardown Error] SQL sweep failed:", error);
    throw error;
  } finally {
    await MySqlDbClient.close().catch(() => { });
  }
}
