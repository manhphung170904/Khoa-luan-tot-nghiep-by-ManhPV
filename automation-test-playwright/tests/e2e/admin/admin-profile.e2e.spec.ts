import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { TestDbRepository } from "@db/repositories";
import { AdminProfilePage } from "@pages/admin/AdminProfilePage";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

function requireTempUser(tempUser: TempStaffProfileUser | null): TempStaffProfileUser {
  expect(tempUser, "Temp admin profile user must be created in beforeEach").toBeTruthy();
  return tempUser!;
}

test.describe("Admin - Profile @regression @e2e", () => {
  let tempUser: TempStaffProfileUser | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    tempUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await new NavigationPage(page).open("/admin/profile");
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempStaffProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test("[E2E-ADM-PRO-001] - Admin Profile - Profile Overview - Current Account Information Display", async ({ page }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new AdminProfilePage(page);
    await profilePage.expectLoaded();

    const values = await profilePage.readProfileValues();
    expect(values.username).toBe(activeUser.username);
    expect(values.email).toBe(activeUser.email);
    expect(values.phone).toBe(activeUser.phone);
  });

  test("[E2E-ADM-PRO-002] - Admin Profile - Success Message - Success SweetAlert Display", async ({ page }) => {
    const profilePage = new AdminProfilePage(page);
    await new NavigationPage(page).open("/admin/profile?successMessage=Cap%20nhat%20thanh%20cong");

    await profilePage.expectSweetAlertContains(/c?p nh?t thnh cng|cap nhat thanh cong|thnh cng|thanh cong/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-ADM-PRO-003] - Admin Profile - Username Update - Successful Update with Valid OTP", async ({ page, adminApi }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new AdminProfilePage(page);
    const nextUsername = TestDataFactory.taoUsername("adm");

    await profilePage.openUsernameModal();
    await profilePage.sendOtpFromModal("username");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, activeUser.email, "PROFILE_USERNAME");
    await profilePage.submitUsernameChange(nextUsername, otp);
    await profilePage.expectSweetAlertContains(/thnh cng|thanh cong|tn dang nh?p|ten dang nhap/i);
    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ username: string }>("SELECT username FROM staff WHERE id = ?", [activeUser.id]);
      return rows[0]?.username ?? "";
    }).toBe(nextUsername);
  });

  test("[E2E-ADM-PRO-004] - Admin Profile - Phone Number Update - Successful Update with Valid OTP", async ({ page, adminApi }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new AdminProfilePage(page);
    const newPhone = TestDataFactory.taoSoDienThoai();

    await profilePage.openPhoneModal();
    await profilePage.sendOtpFromModal("phone");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, activeUser.email, "PROFILE_PHONE");
    await profilePage.submitPhoneChange(newPhone, otp);
    await profilePage.expectSweetAlertContains(/thnh cng|thanh cong|s? di?n tho?i|so dien thoai/i);
    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ phone: string }>("SELECT phone FROM staff WHERE id = ?", [activeUser.id]);
      return rows[0]?.phone ?? "";
    }).toBe(newPhone);
  });

  test("[E2E-ADM-PRO-005] - Admin Profile - Password Confirmation - Client-Side Mismatch Validation", async ({ page }) => {
    const profilePage = new AdminProfilePage(page);

    await profilePage.submitPasswordChange("ValidPass1!", "DifferentPass1!", "000000");
    await profilePage.expectSweetAlertContains(/khng kh?p|khong khop/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-ADM-PRO-006] - Admin Profile - Password Update - Successful Update with Valid OTP and Re-Login", async ({ page, adminApi }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new AdminProfilePage(page);
    const newPassword = "NewAdminPassword1!";
    const oldHashRows = await TestDbRepository.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [activeUser.id]);
    const oldHash = oldHashRows[0]!.password;

    await profilePage.openPasswordModal();
    await profilePage.sendOtpFromModal("password");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, activeUser.email, "PROFILE_PASSWORD");
    await profilePage.submitPasswordChange(newPassword, newPassword, otp);
    await profilePage.expectSweetAlertContains(/thnh cng|thanh cong|m?t kh?u|mat khau/i);
    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [activeUser.id]);
      return rows[0]?.password ?? "";
    }).not.toBe(oldHash);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, activeUser.username, activeUser.password);
    await page.waitForURL(/\/login\?errorMessage=/);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, activeUser.username, newPassword);
    await expect(page).toHaveURL(/\/admin\/|\/login-success/);
  });
});
