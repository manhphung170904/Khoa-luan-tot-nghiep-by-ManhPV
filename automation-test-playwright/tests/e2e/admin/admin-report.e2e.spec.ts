import { expect, test } from "@fixtures/base.fixture";
import { BrowserPrintSpy } from "@helpers/BrowserPrintSpy";
import { AdminReportPage } from "@pages/admin/AdminReportPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - Report @regression @e2e", () => {
  let adminUser: TempStaffProfileUser | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await new AdminReportPage(page).open();
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  test("[E2E-ADM-RPT-001] - Admin Report - Report Overview - KPI and Analytics Display", async ({ page }) => {
    const reportPage = new AdminReportPage(page);
    await reportPage.expectLoaded();
    await reportPage.expectOverviewVisible();
    await expect(page).toHaveURL(/\/admin\/report/);
  });

  test("[E2E-ADM-RPT-002] - Admin Report - Report Year - Selector Year Switching", async ({ page }) => {
    const reportPage = new AdminReportPage(page);
    await reportPage.expectLoaded();

    const availableYears = await reportPage.availableYears();

    expect(availableYears.length).toBeGreaterThan(0);
    const targetYear = availableYears[availableYears.length - 1]!;
    await reportPage.selectYear(targetYear);
    await reportPage.expectYearSelected(targetYear);
  });

  test("[E2E-ADM-RPT-003] - Admin Report - Print Action - Browser Print Trigger", async ({ page }) => {
    const reportPage = new AdminReportPage(page);
    await reportPage.expectLoaded();

    const printSpy = new BrowserPrintSpy(page);
    await printSpy.install();

    await reportPage.triggerPrint();
    expect(printSpy.wasTriggered()).toBeTruthy();
  });
});
