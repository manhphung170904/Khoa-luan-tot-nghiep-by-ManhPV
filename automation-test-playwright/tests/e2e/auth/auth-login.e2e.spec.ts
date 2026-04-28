import { expect, test } from "@fixtures/base.fixture";
import { LoginPage } from "@pages/auth/LoginPage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  type TempCustomerProfileUser
} from "@data/profileTempUsers";

test.describe("Auth - Login @regression @e2e", () => {
  let tempUser: TempCustomerProfileUser | null = null;

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test("[E2E-AUTH-LOGIN-001] - Auth Login - Login Navigation - Registration and Forgot Password Navigation", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.assertLoaded();

    await loginPage.clickRegister();
    await page.waitForURL(/\/register/);

    await loginPage.open();
    await loginPage.clickForgotPassword();
    await page.waitForURL(/\/forgot-password/);
  });

  test("[E2E-AUTH-LOGIN-002] - Auth Login - Login Credentials - Invalid Credentials Error Popup", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.login("unknown-user", "wrong-password");
    await page.waitForURL(/\/login\?errorMessage=/);
    await loginPage.expectPopupContains(/dang nhap that bai|sai tai khoan hoac mat khau|tai khoan khong ton tai|login failed/i);
  });

  test("[E2E-AUTH-LOGIN-003] - Auth Login - Login Submission - Valid Local Customer Redirect", async ({ page, adminApi }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(tempUser.username, tempUser.password);
    await page.waitForURL(/\/customer\/home/);
    await expect(page).toHaveURL(/\/customer\/home/);
  });
});
