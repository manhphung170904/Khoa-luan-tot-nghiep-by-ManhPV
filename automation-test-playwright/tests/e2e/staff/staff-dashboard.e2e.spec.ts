import { expect, test } from "@fixtures/base.fixture";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { StaffDashboardPage } from "@pages/staff/StaffDashboardPage";
import { loginAsTempUser } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Staff - Dashboard @regression", () => {
  let tempContract: TempContract | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.staff.username);
    await page.goto("/staff/dashboard");
  });

  test.afterEach(async ({ adminApi }) => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test("[E2E-STF-DSH-001] - Staff Dashboard - Overview Widgets - Summary Stats and Tables Display", async ({ page }) => {
    const dashboardPage = new StaffDashboardPage(page);
    await dashboardPage.expectLoaded();
    await dashboardPage.expectSummarySectionsVisible();
    await expect(page).toHaveURL(/\/staff\/dashboard/);
  });
});
