import { expect, test } from "@fixtures/base.fixture";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { ForgotPasswordPage } from "@pages/auth/ForgotPasswordPage";
import { LoginPage } from "@pages/auth/LoginPage";
import { ResetPasswordPage } from "@pages/auth/ResetPasswordPage";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  type TempCustomerProfileUser
} from "@data/profileTempUsers";

test.describe("Auth - Password Reset @regression", () => {
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeEach(async ({ adminApi }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test("[E2E-AUTH-RST-001] - Auth Password Reset - Forgot Password - Valid Email Reset Form Navigation", async ({ page }) => {
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

  test("[E2E-AUTH-RST-002] - Auth Password Reset - Password Reset - Successful OTP Reset and New Password Login", async ({
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

  test("[E2E-AUTH-RST-003] - Auth Password Reset - Password Confirmation - Client-Side Mismatch Validation", async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    const resetPage = new ResetPasswordPage(page);

    await forgotPage.open();
    await forgotPage.submitEmail(tempUser!.email);
    await page.waitForURL(new RegExp(`/auth/reset-password\\?email=${encodeURIComponent(tempUser!.email)}`));

    await resetPage.expectLoaded(tempUser!.email);
    await resetPage.resetPassword("123456", "Password@456", "Mismatch@456");
    await resetPage.expectPopupContains(/mat khau khong khop|mật khẩu không khớp|khong khop/i);
  });
});
