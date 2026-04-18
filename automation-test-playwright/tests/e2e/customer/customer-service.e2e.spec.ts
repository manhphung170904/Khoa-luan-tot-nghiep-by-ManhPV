import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { CustomerServicePage } from "@pages/customer/CustomerServicePage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempCustomerProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Customer Service E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.goto("/customer/service");
  });

  test.afterEach(async () => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
  });

  test("[E2E-CUS-SRV-001] customer service page renders key service cards", async ({ page }) => {
    const servicePage = new CustomerServicePage(page);
    await servicePage.expectLoaded();
    await servicePage.expectCardVisible("Đỗ Xe Ô Tô");
    await servicePage.expectCardVisible("Internet Tốc Độ Cao");
    await servicePage.expectCardVisible("Phòng Gym");
    await expect(page).toHaveURL(/\/customer\/service/);
  });

  test("[E2E-CUS-SRV-002] built-in unavailable service buttons stay disabled", async ({ page }) => {
    const servicePage = new CustomerServicePage(page);
    await servicePage.expectLoaded();
    await servicePage.expectRequestDisabled("An Ninh 24/7");
    await servicePage.expectRequestDisabled("Phòng Gym");
  });
});


