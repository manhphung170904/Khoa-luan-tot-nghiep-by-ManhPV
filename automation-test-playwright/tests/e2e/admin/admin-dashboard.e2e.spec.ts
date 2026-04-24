import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { AdminDashboardPage } from "@pages/admin/AdminDashboardPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - Dashboard @regression", () => {
  let adminUser: TempStaffProfileUser | null = null;
  let tempBuildingId: number | null = null;
  let tempBuildingName = "";

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_RENT");
    tempBuildingId = tempBuilding.id;
    tempBuildingName = tempBuilding.name;

    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/dashboard");
  });

  test.afterEach(async ({ adminApi }) => {
    if (tempBuildingId) {
      await TempEntityHelper.xoaBuildingTam(adminApi, tempBuildingId);
    }
    tempBuildingId = null;
    tempBuildingName = "";

    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  test("[E2E-ADM-DSH-001] - Admin Dashboard - Overview Widgets - KPI Analytics and Ranking Display", async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.expectLoaded();
    await dashboardPage.expectOverviewVisible();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("[E2E-ADM-DSH-002] - Admin Dashboard - KPI Cards - Management Navigation", async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.expectLoaded();

    await dashboardPage.openBuildingsFromStatCard();
    await expect(page).toHaveURL(/\/admin\/building\/list/);

    await page.goto("/admin/dashboard");
    await dashboardPage.openCustomersFromStatCard();
    await expect(page).toHaveURL(/\/admin\/customer\/list/);

    await page.goto("/admin/dashboard");
    await dashboardPage.openStaffsFromStatCard();
    await expect(page).toHaveURL(/\/admin\/staff\/list/);

    await page.goto("/admin/dashboard");
    await dashboardPage.openContractsFromStatCard();
    await expect(page).toHaveURL(/\/admin\/contract\/list/);
  });

  test("[E2E-ADM-DSH-003] - Admin Dashboard - Recent Buildings - Detail Navigation", async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.expectLoaded();
    await dashboardPage.expectRecentBuildingVisible(tempBuildingName);
    await dashboardPage.openRecentBuilding(tempBuildingName);
    await expect(page).toHaveURL(new RegExp(`/admin/building/${tempBuildingId}$`));

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM building WHERE id = ? AND name = ?", [
      tempBuildingId,
      tempBuildingName
    ]);
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });
});
