import { expect, test, type APIRequestContext } from "@playwright/test";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { ForgotPasswordPage } from "@pages/auth/ForgotPasswordPage";
import { LoginPage } from "@pages/auth/LoginPage";
import { ResetPasswordPage } from "@pages/auth/ResetPasswordPage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  newAdminApiContext,
  type TempCustomerProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Auth Password Reset E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async () => {
    tempUser = await createTempCustomerProfileUser(adminApi);
  });

  test.afterEach(async () => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-AUTH-RST-001] forgot password redirects user to reset form for valid email", async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    const resetPage = new ResetPasswordPage(page);

    await forgotPage.open();
    await forgotPage.expectLoaded();
    await forgotPage.submitEmail(tempUser!.email);
    await page.waitForURL(new RegExp(`/auth/reset-password\\?email=${encodeURIComponent(tempUser!.email)}`));
    await resetPage.expectLoaded(tempUser!.email);

    const otpRows = await MySqlDbClient.query<{ status: string }>(
      `
        SELECT status
        FROM email_verification
        WHERE email = ? AND purpose = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [tempUser!.email, "RESET_PASSWORD"]
    );
    expect(otpRows[0]?.status).toBe("PENDING");
  });

  test("[E2E-AUTH-RST-002] reset password flow succeeds with OTP from test hook and new login works", async ({
    page,
    request
  }) => {
    const forgotPage = new ForgotPasswordPage(page);
    const resetPage = new ResetPasswordPage(page);
    const loginPage = new LoginPage(page);
    const newPassword = "Password@456";

    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempUser!.id]);
    const oldHash = oldHashRows[0]!.password;

    await forgotPage.open();
    await forgotPage.submitEmail(tempUser!.email);
    await page.waitForURL(new RegExp(`/auth/reset-password\\?email=${encodeURIComponent(tempUser!.email)}`));

    const otp = await ApiOtpAccessHelper.latestOtp(request, tempUser!.email, "RESET_PASSWORD");
    await resetPage.expectLoaded(tempUser!.email);
    await resetPage.resetPassword(otp, newPassword);
    await page.waitForURL(/\/login\?successMessage=/);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempUser!.id]);
      return rows[0]?.password ?? "";
    }).not.toBe(oldHash);

    await loginPage.assertLoaded();
    await loginPage.login(tempUser!.username, tempUser!.password);
    await page.waitForURL(/\/login\?errorMessage=/);

    await loginPage.assertLoaded();
    await loginPage.login(tempUser!.username, newPassword);
    await page.waitForURL(/\/customer\/home/);
  });

  test("[E2E-AUTH-RST-003] reset password client validation blocks mismatched confirmation", async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    const resetPage = new ResetPasswordPage(page);

    await forgotPage.open();
    await forgotPage.submitEmail(tempUser!.email);
    await page.waitForURL(new RegExp(`/auth/reset-password\\?email=${encodeURIComponent(tempUser!.email)}`));

    await resetPage.expectLoaded(tempUser!.email);
    await resetPage.resetPassword("123456", "Password@456", "Mismatch@456");
    await resetPage.expectPopupContains(/Mat khau khong khop|khong khop/i);
  });
});
