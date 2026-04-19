import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { CustomerHomePage } from "@pages/customer/CustomerHomePage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempCustomerProfileUser
} from "@data/profileTempUsers";

test.describe("Customer - Home @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.goto("/customer/home");
  });

  test.afterEach(async () => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
  });

  test("[E2E-CUS-HOME-001] - Customer Home - Dashboard Overview - Dashboard Sections Display", async ({ page }) => {
    const homePage = new CustomerHomePage(page);
    await homePage.expectLoaded();
    await homePage.expectDashboardSectionsVisible();
    await expect(page).toHaveURL(/\/customer\/home/);
  });

  test("[E2E-CUS-HOME-002] - Customer Home - Quick Navigation - Contracts and Buildings Navigation", async ({ page }) => {
    const homePage = new CustomerHomePage(page);
    await homePage.expectLoaded();
    await homePage.openContracts();
    await page.waitForURL(/\/customer\/contract\/list|\/customer\/contracts/);

    await page.goto("/customer/home");
    await homePage.openBuildings();
    await page.waitForURL(/\/customer\/building\/list|\/customer\/buildings/);
  });
});


