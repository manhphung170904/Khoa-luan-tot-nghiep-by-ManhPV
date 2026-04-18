import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { LoginPage } from "@pages/auth/LoginPage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  newAdminApiContext,
  type TempCustomerProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Auth Login E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.afterEach(async () => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-AUTH-LOGIN-001] login page supports navigation to register and forgot password", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.assertLoaded();

    await loginPage.clickRegister();
    await page.waitForURL(/\/register/);

    await loginPage.open();
    await loginPage.clickForgotPassword();
    await page.waitForURL(/\/forgot-password/);
  });

  test("[E2E-AUTH-LOGIN-002] invalid credentials show login failure popup", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.login("unknown-user", "wrong-password");
    await page.waitForURL(/\/login\?errorMessage=/);
    await loginPage.expectPopupContains(
      /đăng nhập thất bại|dang nhap that bai|sai tài khoản hoặc mật khẩu|sai tai khoan hoac mat khau|tài khoản không tồn tại|tai khoan khong ton tai/i
    );
  });

  test("[E2E-AUTH-LOGIN-003] valid local customer login redirects to customer home", async ({ page }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(tempUser.username, tempUser.password);
    await page.waitForURL(/\/customer\/home/);
    await expect(page).toHaveURL(/\/customer\/home/);
  });
});
