import type { FullConfig } from "@playwright/test";
import { MySqlDbClient } from "../utils/db/MySqlDbClient";
import { cleanupDatabaseScope } from "../utils/db/TestDataCleanup";
import fs from "node:fs/promises";
import path from "node:path";

const moonNestRoot = path.resolve(process.cwd(), "..", "moonNest-main");

const uploadCleanupTargets = [
  {
    label: "building image",
    dir: path.resolve(moonNestRoot, "target", "test-upload", "building_img"),
    dbColumn: "image",
    sql: `
      SELECT image AS filename
      FROM building
      WHERE name LIKE 'PW %'
        AND image IS NOT NULL
        AND TRIM(image) <> ''
    `,
    allowedPattern: /^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  },
  {
    label: "planning map image",
    dir: path.resolve(moonNestRoot, "target", "test-upload", "planning_map_img"),
    dbColumn: "image_url",
    sql: `
      SELECT image_url AS filename
      FROM planning_map
      WHERE building_id IN (SELECT id FROM building WHERE name LIKE 'PW %')
        AND image_url IS NOT NULL
        AND TRIM(image_url) <> ''
    `,
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
  const pendingDeletes: Array<{ filePath: string; label: string }> = [];

  for (const target of uploadCleanupTargets) {
    const rows = await MySqlDbClient.query<Record<typeof target.dbColumn, string>>(target.sql);

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

      pendingDeletes.push({
        filePath: resolvedPath,
        label: `${target.label} ${filename}`
      });
    }
  }

  return pendingDeletes;
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
  const buildingRows = await MySqlDbClient.query<{ id: number }>(
    `
      SELECT id
      FROM building
      WHERE name LIKE 'PW Building %'
         OR tax_code LIKE 'PW-%'
    `
  );

  const customerRows = await MySqlDbClient.query<{ id: number; email: string | null }>(
    `
      SELECT id, email
      FROM customer
      WHERE full_name LIKE 'PW Customer %'
         OR username LIKE 'pwcust%'
         OR username LIKE 'e2e_register%'
         OR email LIKE 'pw-customer-%@example.com'
         OR email LIKE 'e2e_register%@example.com'
    `
  );

  const staffRows = await MySqlDbClient.query<{ id: number; email: string | null }>(
    `
      SELECT id, email
      FROM staff
      WHERE full_name LIKE 'PW %'
         OR email LIKE 'pw-%@example.com'
    `
  );

  const verificationRows = await MySqlDbClient.query<{ email: string }>(
    `
      SELECT DISTINCT email
      FROM email_verification
      WHERE email LIKE 'pw-%@example.com'
         OR email LIKE 'e2e_register%@example.com'
    `
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
  } finally {
    await MySqlDbClient.close().catch(() => {});
  }
}
