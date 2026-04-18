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
} from "../_fixtures/profileTempUsers";

test.describe("Customer Profile E2E @regression", () => {
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

  test("[E2E-CUS-PRO-001] customer profile renders current account information", async ({ page }) => {
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

  test("[E2E-CUS-PRO-002] successMessage query shows a success SweetAlert", async ({ page }) => {
    const profilePage = new CustomerProfilePage(page);
    await page.goto("/customer/profile?successMessage=Cap%20nhat%20thanh%20cong");

    await profilePage.expectSweetAlertContains(/Cap nhat thanh cong|thanh cong/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-CUS-PRO-003] local customer username update stays blocked even with a valid OTP", async ({ page }) => {
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

  test("[E2E-CUS-PRO-004] customer can update phone number with a valid OTP", async ({ page }) => {
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

  test("[E2E-CUS-PRO-005] client-side validation blocks password confirmation mismatch", async ({ page }) => {
    const profilePage = new CustomerProfilePage(page);

    await profilePage.submitPasswordChange("ValidPass1!", "DifferentPass1!", "000000");
    await profilePage.expectSweetAlertContains(/khong khop|kh.ng kh.p/i);
    await profilePage.confirmSweetAlertIfPresent();
  });

  test("[E2E-CUS-PRO-006] customer can update password with a valid OTP and log in again", async ({ page }) => {
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


