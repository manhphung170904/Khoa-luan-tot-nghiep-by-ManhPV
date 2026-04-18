import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { AdminDashboardPage } from "@pages/admin/AdminDashboardPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Admin Dashboard E2E @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  let tempBuildingId: number | null = null;
  let tempBuildingName = "";

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    const tempBuilding = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_RENT");
    tempBuildingId = tempBuilding.id;
    tempBuildingName = tempBuilding.name;

    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/dashboard");
  });

  test.afterEach(async () => {
    if (tempBuildingId) {
      await TempEntityHelper.xoaBuildingTam(bootstrapAdminApi, tempBuildingId);
    }
    tempBuildingId = null;
    tempBuildingName = "";

    await cleanupTempStaffProfileUser(bootstrapAdminApi, adminUser);
    adminUser = null;
  });

  test.afterAll(async () => {
    await bootstrapAdminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-ADM-DSH-001] admin dashboard renders KPI, analytics and ranking widgets", async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.expectLoaded();
    await dashboardPage.expectOverviewVisible();
  });

  test("[E2E-ADM-DSH-002] admin can navigate to management lists from KPI cards", async ({ page }) => {
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

  test("[E2E-ADM-DSH-003] admin can open a recent building from dashboard", async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.expectLoaded();
    await dashboardPage.expectRecentBuildingVisible(tempBuildingName);
    await dashboardPage.openRecentBuilding(tempBuildingName);
    await expect(page).toHaveURL(new RegExp(`/admin/building/${tempBuildingId}$`));
  });
});
