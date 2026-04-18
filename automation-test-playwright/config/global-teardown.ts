import type { FullConfig } from "@playwright/test";
import { MySqlDbClient } from "../utils/db/MySqlDbClient";
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

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log("\n[Global Teardown] Starting test data sweep...");

  try {
    await cleanupUploadedTestFiles();

    // 1. Identification
    const testBuildingIds = (await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM building WHERE name LIKE 'PW %'"
    )).map(r => r.id);

    const testCustomerIds = (await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM customer WHERE full_name LIKE 'PW %' OR username LIKE 'pwcust%'"
    )).map(r => r.id);

    const testStaffIds = (await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM staff WHERE full_name LIKE 'PW %' AND (username LIKE 'staff%' OR username LIKE 'admin%')"
    )).map(r => r.id);

    if (testBuildingIds.length === 0 && testCustomerIds.length === 0 && testStaffIds.length === 0) {
      console.log("[Global Teardown] No orphaned test data found.");
      return;
    }

    console.log(`[Global Teardown] Cleaning up: ${testBuildingIds.length} Buildings, ${testCustomerIds.length} Customers, ${testStaffIds.length} Staff members.`);

    // 2. Ordered Deletion (Bottom-up to respect FK constraints)
    
    // Invoices and Meters
    if (testCustomerIds.length > 0) {
      await MySqlDbClient.execute(`DELETE FROM invoice_detail WHERE invoice_id IN (SELECT id FROM invoice WHERE customer_id IN (${testCustomerIds.join(",")}))`);
      await MySqlDbClient.execute(`DELETE FROM invoice WHERE customer_id IN (${testCustomerIds.join(",")})`);
      await MySqlDbClient.execute(`DELETE FROM utility_meter WHERE contract_id IN (SELECT id FROM contract WHERE customer_id IN (${testCustomerIds.join(",")}))`);
    }

    // Requests and Contracts
    const idListFilter = (ids: number[]) => ids.length > 0 ? ids.join(",") : "0";
    
    await MySqlDbClient.execute(`
      DELETE FROM property_request 
      WHERE customer_id IN (${idListFilter(testCustomerIds)}) 
         OR building_id IN (${idListFilter(testBuildingIds)})
         OR processed_by IN (${idListFilter(testStaffIds)})
    `);

    await MySqlDbClient.execute(`
      DELETE FROM contract 
      WHERE customer_id IN (${idListFilter(testCustomerIds)}) 
         OR building_id IN (${idListFilter(testBuildingIds)})
         OR staff_id IN (${idListFilter(testStaffIds)})
    `);

    await MySqlDbClient.execute(`
      DELETE FROM sale_contract 
      WHERE customer_id IN (${idListFilter(testCustomerIds)}) 
         OR building_id IN (${idListFilter(testBuildingIds)})
         OR staff_id IN (${idListFilter(testStaffIds)})
    `);

    // Assignments
    await MySqlDbClient.execute(`
      DELETE FROM assignment_building 
      WHERE building_id IN (${idListFilter(testBuildingIds)}) 
         OR staff_id IN (${idListFilter(testStaffIds)})
    `);

    await MySqlDbClient.execute(`
      DELETE FROM assignment_customer 
      WHERE customer_id IN (${idListFilter(testCustomerIds)}) 
         OR staff_id IN (${idListFilter(testStaffIds)})
    `);

    // Building metadata
    if (testBuildingIds.length > 0) {
      const bIds = testBuildingIds.join(",");
      await MySqlDbClient.execute(`DELETE FROM rent_area WHERE building_id IN (${bIds})`);
      await MySqlDbClient.execute(`DELETE FROM nearby_amenity WHERE building_id IN (${bIds})`);
      await MySqlDbClient.execute(`DELETE FROM planning_map WHERE building_id IN (${bIds})`);
      await MySqlDbClient.execute(`DELETE FROM legal_authority WHERE building_id IN (${bIds})`);
      await MySqlDbClient.execute(`DELETE FROM supplier WHERE building_id IN (${bIds})`);
      await MySqlDbClient.execute(`DELETE FROM building WHERE id IN (${bIds})`);
    }

    // Core Entities
    if (testCustomerIds.length > 0) {
      await MySqlDbClient.execute(`DELETE FROM customer WHERE id IN (${testCustomerIds.join(",")})`);
    }
    if (testStaffIds.length > 0) {
      await MySqlDbClient.execute(`DELETE FROM staff WHERE id IN (${testStaffIds.join(",")})`);
    }

    console.log("[Global Teardown] Cleanup completed successfully.");
  } catch (error) {
    console.error("[Global Teardown Error] SQL sweep failed:", error);
  }
}
