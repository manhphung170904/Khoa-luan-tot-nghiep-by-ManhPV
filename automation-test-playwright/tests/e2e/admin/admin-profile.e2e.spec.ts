import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { AdminProfilePage } from "@pages/admin/AdminProfilePage";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - Profile @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempStaffProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.goto("/admin/profile");
  });

  test.afterEach(async () => {
    await cleanupTempStaffProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-ADM-PRO-001] - Admin Profile - Profile Overview - Current Account Information Display", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new AdminProfilePage(page);
    await profilePage.expectLoaded();

    const values = await profilePage.readProfileValues();
    expect(values.username).toBe(tempUser.username);
    expect(values.email).toBe(tempUser.email);
    expect(values.phone).toBe(tempUser.phone);
  });

  test("[E2E-ADM-PRO-002] - Admin Profile - Success Message - Success SweetAlert Display", async ({ page }) => {
    const profilePage = new AdminProfilePage(page);
    await page.goto("/admin/profile?successMessage=Cap%20nhat%20thanh%20cong");

    await profilePage.expectSweetAlertContains(/cập nhật thành công|cap nhat thanh cong|thành công|thanh cong/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-ADM-PRO-003] - Admin Profile - Username Update - Successful Update with Valid OTP", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new AdminProfilePage(page);
    const nextUsername = `adm${Date.now().toString().slice(-7)}`;

    await profilePage.openUsernameModal();
    await profilePage.sendOtpFromModal("username");
    await profilePage.expectSweetAlertContains(/OTP|gửi mã|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_USERNAME");
    await profilePage.submitUsernameChange(nextUsername, otp);
    await profilePage.expectSweetAlertContains(/thành công|thanh cong|tên đăng nhập/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ username: string }>("SELECT username FROM staff WHERE id = ?", [tempUser!.id]);
      return rows[0]?.username ?? "";
    }).toBe(nextUsername);
  });

  test("[E2E-ADM-PRO-004] - Admin Profile - Phone Number Update - Successful Update with Valid OTP", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new AdminProfilePage(page);
    const newPhone = `0${String(Date.now()).slice(-9)}`;

    await profilePage.openPhoneModal();
    await profilePage.sendOtpFromModal("phone");
    await profilePage.expectSweetAlertContains(/OTP|gửi mã|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_PHONE");
    await profilePage.submitPhoneChange(newPhone, otp);
    await profilePage.expectSweetAlertContains(/thành công|thanh cong|số điện thoại/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM staff WHERE id = ?", [tempUser!.id]);
      return rows[0]?.phone ?? "";
    }).toBe(newPhone);
  });

  test("[E2E-ADM-PRO-005] - Admin Profile - Password Confirmation - Client-Side Mismatch Validation", async ({ page }) => {
    const profilePage = new AdminProfilePage(page);

    await profilePage.submitPasswordChange("ValidPass1!", "DifferentPass1!", "000000");
    await profilePage.expectSweetAlertContains(/không khớp|khong khop/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-ADM-PRO-006] - Admin Profile - Password Update - Successful Update with Valid OTP and Re-Login", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new AdminProfilePage(page);
    const newPassword = "NewAdminPassword1!";
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempUser.id]);
    const oldHash = oldHashRows[0]!.password;

    await profilePage.openPasswordModal();
    await profilePage.sendOtpFromModal("password");
    await profilePage.expectSweetAlertContains(/OTP|gửi mã|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_PASSWORD");
    await profilePage.submitPasswordChange(newPassword, newPassword, otp);
    await profilePage.expectSweetAlertContains(/thành công|thanh cong|mật khẩu/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempUser!.id]);
      return rows[0]?.password ?? "";
    }).not.toBe(oldHash);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.waitForURL(/\/login\?errorMessage=/);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, tempUser.username, newPassword);
    await expect(page).toHaveURL(/\/admin\/|\/login-success/);
  });
});


