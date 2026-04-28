import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { TestDbRepository } from "@db/repositories";
import { CustomerProfilePage } from "@pages/customer/CustomerProfilePage";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  loginAsTempUser,
  type TempCustomerProfileUser
} from "@data/profileTempUsers";

function requireTempUser(tempUser: TempCustomerProfileUser | null): TempCustomerProfileUser {
  expect(tempUser, "Temp customer profile user must be created in beforeEach").toBeTruthy();
  return tempUser!;
}

test.describe("Customer - Profile @regression @e2e", () => {
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await new NavigationPage(page).open("/customer/profile");
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test("[E2E-CUS-PRO-001] - Customer Profile - Profile Overview - Current Account Information Display", async ({ page }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new CustomerProfilePage(page);
    await profilePage.expectLoaded();

    const values = await profilePage.readProfileValues();
    expect(values.username).toBe(activeUser.username);
    expect(values.email).toBe(activeUser.email);
    expect(values.phone).toBe(activeUser.phone);
  });

  test("[E2E-CUS-PRO-002] - Customer Profile - Success Message - Success SweetAlert Display", async ({ page }) => {
    const profilePage = new CustomerProfilePage(page);
    await new NavigationPage(page).open("/customer/profile?successMessage=Cap%20nhat%20thanh%20cong");

    await profilePage.expectSweetAlertContains(/cap nhat thanh cong|thanh cong/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-CUS-PRO-003] - Customer Profile - Username Update - Rejection Without Password Confirmation", async ({ page }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new CustomerProfilePage(page);
    const originalValues = await profilePage.readProfileValues();

    await profilePage.openUsernameModal();
    await profilePage.submitUsernameChange(TestDataFactory.taoUsername("cust"), "000000");
    await profilePage.expectSweetAlertContains(/loi|that bai|error|mat khau|otp/i);
    await profilePage.confirmSweetAlertIfPresent();

    const dbRows = await TestDbRepository.query<{ username: string }>("SELECT username FROM customer WHERE id = ?", [activeUser.id]);
    expect(dbRows[0]?.username).toBe(activeUser.username);
    expect((await profilePage.readProfileValues()).username).toBe(originalValues.username);
  });

  test("[E2E-CUS-PRO-004] - Customer Profile - Phone Number Update - Successful Update with Valid OTP", async ({ page, adminApi }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new CustomerProfilePage(page);
    const newPhone = TestDataFactory.taoSoDienThoai();

    await profilePage.openPhoneModal();
    await profilePage.sendOtpFromModal("phone");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, activeUser.email, "PROFILE_PHONE");
    await profilePage.submitPhoneChange(newPhone, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|cap nhat so/i);
    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ phone: string }>("SELECT phone FROM customer WHERE id = ?", [activeUser.id]);
      return rows[0]?.phone ?? "";
    }).toBe(newPhone);
  });

  test("[E2E-CUS-PRO-005] - Customer Profile - Password Confirmation - Client-Side Mismatch Validation", async ({ page }) => {
    const profilePage = new CustomerProfilePage(page);

    await profilePage.submitPasswordChange("ValidPass1!", "DifferentPass1!", "000000");
    await profilePage.expectSweetAlertContains(/khong khop/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-CUS-PRO-006] - Customer Profile - Password Update - Successful Update with Valid OTP and Re-Login", async ({ page, adminApi }) => {
    const activeUser = requireTempUser(tempUser);

    const profilePage = new CustomerProfilePage(page);
    const newPassword = "NewCustomerPwd1!";
    const oldHashRows = await TestDbRepository.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [activeUser.id]);
    const oldHash = oldHashRows[0]!.password;

    await profilePage.openPasswordModal();
    await profilePage.sendOtpFromModal("password");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, activeUser.email, "PROFILE_PASSWORD");
    await profilePage.submitPasswordChange(newPassword, newPassword, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|mat khau/i);
    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [activeUser.id]);
      return rows[0]?.password ?? "";
    }).not.toBe(oldHash);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, activeUser.username, activeUser.password);
    await page.waitForURL(/\/login\?errorMessage=/);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, activeUser.username, newPassword);
    await expect(page).toHaveURL(/\/customer\/|\/login-success/);
  });
});
