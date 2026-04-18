import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { StaffProfilePage } from "@pages/staff/StaffProfilePage";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Staff - E2E profile @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempStaffProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempUser = await createTempStaffProfileUser(adminApi, "STAFF");
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.goto("/staff/profile");
  });

  test.afterEach(async () => {
    await cleanupTempStaffProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-STF-PRO-001] staff profile hien current account information", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new StaffProfilePage(page);
    await profilePage.expectLoaded();

    const values = await profilePage.readProfileValues();
    expect(values.username).toBe(tempUser.username);
    expect(values.email).toBe(tempUser.email);
    expect(values.phone).toBe(tempUser.phone);
  });

  test("[E2E-STF-PRO-002] errorMessage query hien an error SweetAlert", async ({ page }) => {
    const profilePage = new StaffProfilePage(page);
    await page.goto("/staff/profile?errorMessage=Cap%20nhat%20that%20bai");

    await profilePage.expectSweetAlertContains(/that bai|error/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-STF-PRO-003] staff co cap nhat username voi OTP hop le", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new StaffProfilePage(page);
    const nextUsername = `stf${Date.now().toString().slice(-7)}`;

    await profilePage.openUsernameModal();
    await profilePage.sendOtpFromModal("username");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_USERNAME");
    await profilePage.submitUsernameChange(nextUsername, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|ten dang nhap/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ username: string }>("SELECT username FROM staff WHERE id = ?", [tempUser!.id]);
      return rows[0]?.username ?? "";
    }).toBe(nextUsername);
  });

  test("[E2E-STF-PRO-004] staff co cap nhat phone number voi OTP hop le", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new StaffProfilePage(page);
    const newPhone = `0${String(Date.now()).slice(-9)}`;

    await profilePage.openPhoneModal();
    await profilePage.sendOtpFromModal("phone");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_PHONE");
    await profilePage.submitPhoneChange(newPhone, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|so dien thoai/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM staff WHERE id = ?", [tempUser!.id]);
      return rows[0]?.phone ?? "";
    }).toBe(newPhone);
  });

  test("[E2E-STF-PRO-005] client-side validation chan mismatched password confirmation", async ({ page }) => {
    const profilePage = new StaffProfilePage(page);

    await profilePage.submitPasswordChange("ValidPass1!", "DifferentPass1!", "000000");
    await profilePage.expectSweetAlertContains(/khong khop|kh.ng kh.p/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-STF-PRO-006] staff co the cap nhat password voi OTP hop le va dang nhap lai", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new StaffProfilePage(page);
    const newPassword = "NewStaffPassword1!";
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempUser.id]);
    const oldHash = oldHashRows[0]!.password;

    await profilePage.openPasswordModal();
    await profilePage.sendOtpFromModal("password");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_PASSWORD");
    await profilePage.submitPasswordChange(newPassword, newPassword, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|mat khau/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempUser!.id]);
      return rows[0]?.password ?? "";
    }).not.toBe(oldHash);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.waitForURL(/\/login\?errorMessage=/);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, tempUser.username, newPassword);
    await expect(page).toHaveURL(/\/staff\/|\/login-success/);
  });
});


