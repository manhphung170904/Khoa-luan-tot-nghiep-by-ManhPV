import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { AdminReportPage } from "@pages/admin/AdminReportPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - E2E report @regression", () => {
  let adminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/report");
  });

  test.afterEach(async () => {
    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
  });

  test("[E2E-ADM-RPT-001] admin report hien KPI va analytics muc", async ({ page }) => {
    const reportPage = new AdminReportPage(page);
    await reportPage.expectLoaded();
    await reportPage.expectOverviewVisible();
    await expect(page).toHaveURL(/\/admin\/report/);
  });

  test("[E2E-ADM-RPT-002] admin co switch report year tu selector", async ({ page }) => {
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

  test("[E2E-ADM-RPT-003] admin co trigger browser print tu report trang", async ({ page }) => {
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


