import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { LoginPage } from "@pages/auth/LoginPage";
import { RegisterCompletePage } from "@pages/auth/RegisterCompletePage";
import { RegisterPage } from "@pages/auth/RegisterPage";
import { RegisterVerifyPage } from "@pages/auth/RegisterVerifyPage";

type RegistrationUser = {
  email: string;
  fullName: string;
  username: string;
  password: string;
};

function buildRegistrationUser(prefix: string): RegistrationUser {
  const unique = `${prefix}_${Date.now()}`;
  return {
    email: `${unique}@example.com`,
    fullName: "E2E Register User",
    username: unique,
    password: "Password@123"
  };
}

async function cleanupRegistrationUser(user: RegistrationUser): Promise<void> {
  await MySqlDbClient.execute("DELETE FROM customer WHERE email = ?", [user.email]);
  await MySqlDbClient.execute("DELETE FROM email_verification WHERE email = ?", [user.email]);
}

async function completeRegistrationFlow(
  page: Page,
  request: APIRequestContext,
  user: RegistrationUser
): Promise<void> {
  const registerPage = new RegisterPage(page);
  const verifyPage = new RegisterVerifyPage(page);
  const completePage = new RegisterCompletePage(page);

  await registerPage.open();
  await registerPage.expectLoaded();
  await registerPage.requestRegistrationCode(user.email);
  await page.waitForURL(new RegExp(`/register/verify\\?email=${encodeURIComponent(user.email)}`));

  const otp = await ApiOtpAccessHelper.latestOtp(request, user.email, "REGISTER");
  await verifyPage.expectLoaded(user.email);
  await verifyPage.verifyOtp(otp);
  await page.waitForURL(/\/register\/complete\?/);

  await completePage.expectLoaded(user.email);
  await completePage.completeRegistration(user.fullName, user.username, user.password);
  await page.waitForURL(/\/customer\/home/);
}

test.describe("Auth Registration E2E @regression", () => {
  test.afterEach(async () => {
    await MySqlDbClient.close();
  });

  test("[E2E-AUTH-REG-001] user can complete local registration through OTP flow", async ({ page, request }) => {
    const user = buildRegistrationUser("e2e_register");

    try {
      await completeRegistrationFlow(page, request, user);

      const createdRows = await MySqlDbClient.query<{ username: string }>(
        "SELECT username FROM customer WHERE email = ? AND username = ?",
        [user.email, user.username]
      );
      expect(createdRows.length).toBe(1);
    } finally {
      await cleanupRegistrationUser(user);
    }
  });

  test("[E2E-AUTH-REG-002] register verify shows error popup for invalid OTP", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const verifyPage = new RegisterVerifyPage(page);
    const user = buildRegistrationUser("e2e_register_invalid");

    try {
      await registerPage.open();
      await registerPage.requestRegistrationCode(user.email);
      await page.waitForURL(new RegExp(`/register/verify\\?email=${encodeURIComponent(user.email)}`));

      await verifyPage.expectLoaded(user.email);
      await verifyPage.verifyOtp("000000");
      await page.waitForURL(/\/register\/verify\?/);
      await verifyPage.expectPopupContains(/Xác thực thất bại|OTP|mã/i);
    } finally {
      await cleanupRegistrationUser(user);
    }
  });

  test("[E2E-AUTH-REG-003] completed registration account can log in from login page", async ({ page, request }) => {
    const user = buildRegistrationUser("e2e_register_login");
    const loginPage = new LoginPage(page);

    try {
      await completeRegistrationFlow(page, request, user);
      await page.context().clearCookies();
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.login(user.username, user.password);
      await page.waitForURL(/\/customer\/home/);
    } finally {
      await cleanupRegistrationUser(user);
    }
  });
});
