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

async function assertNoRegisteredCustomer(user: RegistrationUser): Promise<void> {
  const rows = await MySqlDbClient.query<{ count: number }>(
    "SELECT COUNT(*) AS count FROM customer WHERE email = ? OR username = ?",
    [user.email, user.username]
  );
  expect(Number(rows[0]?.count ?? 0)).toBe(0);
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

      const otpRows = await MySqlDbClient.query<{ status: string }>(
        `
          SELECT status
          FROM email_verification
          WHERE email = ? AND purpose = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [user.email, "REGISTER"]
      );
      expect(otpRows[0]?.status).toBe("USED");
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
      await verifyPage.expectPopupContains(
        /xác thực thất bại|xac thuc that bai|otp không hợp lệ|otp khong hop le|mã otp không hợp lệ|ma otp khong hop le/i
      );
      await expect(page).not.toHaveURL(/\/register\/complete\?/);

      const otpRows = await MySqlDbClient.query<{ status: string }>(
        `
          SELECT status
          FROM email_verification
          WHERE email = ? AND purpose = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [user.email, "REGISTER"]
      );
      expect(otpRows[0]?.status).toBe("PENDING");
      await assertNoRegisteredCustomer(user);
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

      await page.context().clearCookies();
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.login(user.username, "WrongPassword!123");
      await page.waitForURL(/\/login\?errorMessage=/);
      await loginPage.expectPopupContains(
        /đăng nhập thất bại|dang nhap that bai|sai tài khoản hoặc mật khẩu|sai tai khoan hoac mat khau/i
      );
    } finally {
      await cleanupRegistrationUser(user);
    }
  });
});
