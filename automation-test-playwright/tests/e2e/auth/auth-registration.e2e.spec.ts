import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext, Page } from "@playwright/test";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { cleanupDatabaseScope } from "@db/TestDataCleanup";
import { TestDataFactory } from "@helpers/TestDataFactory";
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
  const unique = TestDataFactory.taoUsername(prefix);
  return {
    email: `${unique}@example.com`,
    fullName: "E2E Register User",
    username: unique,
    password: "Password@123"
  };
}

async function cleanupRegistrationUser(user: RegistrationUser): Promise<void> {
  const rows = await MySqlDbClient.query<{ id: number }>(
    "SELECT id FROM customer WHERE email = ? OR username = ?",
    [user.email, user.username]
  );
  await cleanupDatabaseScope({
    customerIds: rows.map((row) => row.id),
    emails: [user.email]
  });
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

test.describe("Auth - Registration @regression", () => {
  test.afterEach(async () => {
  });

  test("[E2E-AUTH-REG-001] - Auth Registration - Registration Flow - Local Registration via OTP", async ({ page, request }) => {
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

  test("[E2E-AUTH-REG-002] - Auth Registration - OTP Verification - Invalid OTP Error Popup", async ({ page }) => {
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
        /xác thực thất bại|xac thuc that bai|otp khong hop le|ma otp khong hop le|verification failed/i
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

  test("[E2E-AUTH-REG-003] - Auth Registration - Post-Registration Login - Registered Account Login from Login Page", async ({ page, request }) => {
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
        /đăng nhập thất bại|dang nhap that bai|sai tài khoản hoặc mật khẩu|sai tai khoan hoac mat khau|login failed/i
      );
    } finally {
      await cleanupRegistrationUser(user);
    }
  });
});



