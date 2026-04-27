import type { APIRequestContext, Page } from "@playwright/test";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

export type AdminE2ESession = {
  user: TempStaffProfileUser;
  cleanup: () => Promise<void>;
};

export async function createAdminE2ESession(
  page: Page,
  adminApi: APIRequestContext,
  landingPath: string
): Promise<AdminE2ESession> {
  const user = await createTempStaffProfileUser(adminApi, "ADMIN");
  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) {
      return;
    }

    cleaned = true;
    await cleanupTempStaffProfileUser(adminApi, user);
  };

  try {
    await loginAsTempUser(page, user.username, user.password);
    await page.goto(landingPath);
    return { user, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function cleanupTempContracts(
  adminApi: APIRequestContext,
  contracts: Array<Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>>
): Promise<void> {
  for (const contract of contracts.splice(0)) {
    await TempEntityHelper.xoaContractTam(adminApi, contract);
  }
}

export async function cleanupTempBuildingIds(adminApi: APIRequestContext, buildingIds: Set<number>): Promise<void> {
  for (const buildingId of buildingIds) {
    await TempEntityHelper.xoaBuildingTam(adminApi, buildingId);
  }

  buildingIds.clear();
}
