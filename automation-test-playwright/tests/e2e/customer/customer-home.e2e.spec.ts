import { expect, test, type APIRequestContext } from "@playwright/test";
import { CustomerHomePage } from "@pages/customer/CustomerHomePage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempCustomerProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Customer Home E2E @regression", () => {
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

  test("[E2E-CUS-HOME-001] customer home renders dashboard sections", async ({ page }) => {
    const homePage = new CustomerHomePage(page);
    await homePage.expectLoaded();
    await homePage.expectDashboardSectionsVisible();
    await expect(page).toHaveURL(/\/customer\/home/);
  });

  test("[E2E-CUS-HOME-002] customer can navigate from home to contracts and buildings", async ({ page }) => {
    const homePage = new CustomerHomePage(page);
    await homePage.expectLoaded();
    await homePage.openContracts();
    await page.waitForURL(/\/customer\/contract\/list|\/customer\/contracts/);

    await page.goto("/customer/home");
    await homePage.openBuildings();
    await page.waitForURL(/\/customer\/building\/list|\/customer\/buildings/);
  });
});
