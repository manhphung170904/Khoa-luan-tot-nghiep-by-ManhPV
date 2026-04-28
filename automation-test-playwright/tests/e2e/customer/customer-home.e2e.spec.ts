import { expect, test } from "@fixtures/base.fixture";
import { CustomerHomePage } from "@pages/customer/CustomerHomePage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  loginAsTempUser,
  type TempCustomerProfileUser
} from "@data/profileTempUsers";
import { NavigationPage } from "@pages/core/NavigationPage";

test.describe("Customer - Home @regression @e2e", () => {
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await new NavigationPage(page).open("/customer/home");
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
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

    await new NavigationPage(page).open("/customer/home");
    await homePage.openBuildings();
    await page.waitForURL(/\/customer\/building\/list|\/customer\/buildings/);
  });
});
