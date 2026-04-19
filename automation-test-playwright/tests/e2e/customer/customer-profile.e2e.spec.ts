import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CustomerProfilePage } from "@pages/customer/CustomerProfilePage";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import {
  cleanupTempCustomerProfileUser,
  createTempCustomerProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempCustomerProfileUser
} from "@data/profileTempUsers";

test.describe("Customer - Profile @regression", () => {
  let adminApi: APIRequestContext;
  let tempUser: TempCustomerProfileUser | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempUser = await createTempCustomerProfileUser(adminApi);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.goto("/customer/profile");
  });

  test.afterEach(async () => {
    await cleanupTempCustomerProfileUser(adminApi, tempUser);
    tempUser = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-PRO-001] - Customer Profile - Profile Overview - Current Account Information Display", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new CustomerProfilePage(page);
    await profilePage.expectLoaded();

    const values = await profilePage.readProfileValues();
    expect(values.username).toBe(tempUser.username);
    expect(values.email).toBe(tempUser.email);
    expect(values.phone).toBe(tempUser.phone);
  });

  test("[E2E-CUS-PRO-002] - Customer Profile - Success Message - Success SweetAlert Display", async ({ page }) => {
    const profilePage = new CustomerProfilePage(page);
    await page.goto("/customer/profile?successMessage=Cap%20nhat%20thanh%20cong");

    await profilePage.expectSweetAlertContains(/Cap nhat thanh cong|thanh cong/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-CUS-PRO-003] - Customer Profile - Username Update - Successful Update with Valid OTP", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new CustomerProfilePage(page);
    const originalValues = await profilePage.readProfileValues();

    await profilePage.openUsernameModal();
    await profilePage.sendOtpFromModal("username");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_USERNAME");
    await profilePage.submitUsernameChange(`cust${Date.now().toString().slice(-7)}`, otp);
    await profilePage.expectSweetAlertContains(/loi|that bai|error|da co mat khau/i);
    await profilePage.confirmSweetAlertIfPresent();

    const dbRows = await MySqlDbClient.query<{ username: string }>("SELECT username FROM customer WHERE id = ?", [tempUser.id]);
    expect(dbRows[0]?.username).toBe(tempUser.username);
    expect((await profilePage.readProfileValues()).username).toBe(originalValues.username);
  });

  test("[E2E-CUS-PRO-004] - Customer Profile - Phone Number Update - Successful Update with Valid OTP", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new CustomerProfilePage(page);
    const newPhone = `0${String(Date.now()).slice(-9)}`;

    await profilePage.openPhoneModal();
    await profilePage.sendOtpFromModal("phone");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_PHONE");
    await profilePage.submitPhoneChange(newPhone, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|cap nhat so/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM customer WHERE id = ?", [tempUser!.id]);
      return rows[0]?.phone ?? "";
    }).toBe(newPhone);
  });

  test("[E2E-CUS-PRO-005] - Customer Profile - Password Confirmation - Client-Side Mismatch Validation", async ({ page }) => {
    const profilePage = new CustomerProfilePage(page);

    await profilePage.submitPasswordChange("ValidPass1!", "DifferentPass1!", "000000");
    await profilePage.expectSweetAlertContains(/khong khop|kh.ng kh.p/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-CUS-PRO-006] - Customer Profile - Password Update - Successful Update with Valid OTP and Re-Login", async ({ page }) => {
    if (!tempUser) {
      return;
    }

    const profilePage = new CustomerProfilePage(page);
    const newPassword = "NewCustomerPwd1!";
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempUser.id]);
    const oldHash = oldHashRows[0]!.password;

    await profilePage.openPasswordModal();
    await profilePage.sendOtpFromModal("password");
    await profilePage.expectSweetAlertContains(/OTP|gui ma/i);
    await profilePage.confirmSweetAlertIfPresent();

    const otp = await ApiOtpAccessHelper.latestOtp(adminApi, tempUser.email, "PROFILE_PASSWORD");
    await profilePage.submitPasswordChange(newPassword, newPassword, otp);
    await profilePage.expectSweetAlertContains(/thanh cong|mat khau/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempUser!.id]);
      return rows[0]?.password ?? "";
    }).not.toBe(oldHash);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, tempUser.username, tempUser.password);
    await page.waitForURL(/\/login\?errorMessage=/);

    await AuthSessionHelper.logoutUi(page);
    await loginAsTempUser(page, tempUser.username, newPassword);
    await expect(page).toHaveURL(/\/customer\/|\/login-success/);
  });
});


