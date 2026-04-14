import fs from "node:fs/promises";
import path from "node:path";
import { test as setup, type Page } from "@playwright/test";
import { AuthSessionHelper, type UserRole } from "@helpers/AuthSessionHelper";
import { storageStatePaths } from "@helpers/StorageStateHelper";

async function createRoleStorageState(page: Page, role: UserRole, outputFile: string): Promise<void> {
  await AuthSessionHelper.loginAsRoleUi(page, role);
  await page.waitForLoadState("domcontentloaded");

  const cookies = await page.context().cookies();
  if (!cookies.length) {
    throw new Error(`Khong luu duoc storage state cho role ${role}. Phien dang nhap khong tao cookie.`);
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await page.context().storageState({ path: outputFile });
}

setup.describe.configure({ mode: "serial" });

setup("Tao storage state cho admin", async ({ page }) => {
  await createRoleStorageState(page, "admin", storageStatePaths.admin);
});

setup("Tao storage state cho staff", async ({ page }) => {
  await createRoleStorageState(page, "staff", storageStatePaths.staff);
});

setup("Tao storage state cho customer", async ({ page }) => {
  await createRoleStorageState(page, "customer", storageStatePaths.customer);
});
