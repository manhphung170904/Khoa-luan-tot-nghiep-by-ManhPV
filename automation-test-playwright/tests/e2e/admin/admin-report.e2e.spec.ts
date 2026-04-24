import { expect, test } from "@fixtures/base.fixture";
import { AdminReportPage } from "@pages/admin/AdminReportPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - Report @regression", () => {
  let adminUser: TempStaffProfileUser | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/report");
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

    const availableYears = await page.locator(".year-select option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );

    expect(availableYears.length).toBeGreaterThan(0);
    const targetYear = availableYears[availableYears.length - 1]!;
    await reportPage.selectYear(targetYear);
    await reportPage.expectYearSelected(targetYear);
  });

  test("[E2E-ADM-RPT-003] - Admin Report - Print Action - Browser Print Trigger", async ({ page }) => {
    const reportPage = new AdminReportPage(page);
    await reportPage.expectLoaded();

    let printTriggered = false;
    await page.exposeFunction("__e2eMarkPrint", () => {
      printTriggered = true;
    });
    await page.evaluate(() => {
      const originalPrint = window.print;
      window.print = () => {
        void (window as typeof window & { __e2eMarkPrint: () => void }).__e2eMarkPrint();
        window.print = originalPrint;
      };
    });

    await reportPage.triggerPrint();
    expect(printTriggered).toBeTruthy();
  });
});
