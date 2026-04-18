import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { env } from "@config/env";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

type TempCustomer = {
  id: number;
  username: string;
  email: string;
  phone: string;
};

test.describe.serial("Customer Profile API Tests @api @api-write @otp @regression", () => {
  let bootstrapAdmin: APIRequestContext;
  let customerContext: APIRequestContext;
  let managerStaffId = 0;
  let tempCustomer: TempCustomer;
  let currentPassword = env.defaultPassword;

  const createTempCustomer = async (): Promise<TempCustomer> => {
    const payload = TestDataFactory.buildCustomerPayload({ staffIds: [managerStaffId] });
    const response = await bootstrapAdmin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: payload
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.customers.create,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<TempCustomer>(
      `
        SELECT id, username, email, phone
        FROM customer
        WHERE username = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [String(payload.username)]
    );
    expect(rows.length).toBe(1);
    return rows[0]!;
  };

  const sendOtp = async (purpose: string) => {
    const response = await customerContext.post(`/api/v1/customer/profile/otp/${purpose}`, {
      failOnStatusCode: false
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.customer.profile.otp,
      dataMode: "null"
    });
  };

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdmin = await ApiSessionHelper.newContext(playwright, "admin");
    const tempStaff = await TempEntityHelper.taoStaffTam(bootstrapAdmin);
    managerStaffId = tempStaff.id;
    tempCustomer = await createTempCustomer();
    customerContext = await ApiSessionHelper.newContext(playwright);

    const loginResponse = await ApiSessionHelper.login(customerContext, tempCustomer.username, currentPassword);
    expect(loginResponse.status()).toBe(200);
  });

  test.afterAll(async () => {
    await customerContext.dispose();
    await bootstrapAdmin.delete(`/api/v1/admin/customers/${tempCustomer.id}`, { failOnStatusCode: false });
    await TempEntityHelper.xoaStaffTam(bootstrapAdmin, managerStaffId);
    await bootstrapAdmin.dispose();
    await MySqlDbClient.close();
  });

  test("[CUS-PRO-001] rejects anonymous access to customer profile mutation endpoints", async ({ request }) => {
    const usernameResponse = await request.put("/api/v1/customer/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: "customer_hacked",
        otp: "000000"
      }
    });
    await expectApiErrorBody(usernameResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/customer/profile/username"
    });

    const emailResponse = await request.put("/api/v1/customer/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: "hacked@example.com",
        password: "wrong-password"
      }
    });
    await expectApiErrorBody(emailResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/customer/profile/email"
    });

    const passwordResponse = await request.put("/api/v1/customer/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
        otp: "000000"
      }
    });
    await expectApiErrorBody(passwordResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/customer/profile/password"
    });

    const otpResponse = await request.post("/api/v1/customer/profile/otp/PROFILE_PHONE", {
      failOnStatusCode: false
    });
    await expectApiErrorBody(otpResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/customer/profile/otp/PROFILE_PHONE"
    });
  });

  test("[CUS-PRO-001A] sends OTP for phone update and marks row pending", async () => {
    await sendOtp("PROFILE_PHONE");
    const latest = await ApiOtpHelper.latest(tempCustomer.email, "PROFILE_PHONE");
    expect(latest?.status).toBe("PENDING");
  });

  test("[CUS-PRO-001B] username update for local customer stays blocked even with valid OTP", async () => {
    await sendOtp("PROFILE_USERNAME");
    const otp = await ApiOtpAccessHelper.latestOtp(customerContext, tempCustomer.email, "PROFILE_USERNAME");
    const originalUsername = tempCustomer.username;

    const response = await customerContext.put("/api/v1/customer/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: `cus${Date.now().toString().slice(-7)}`,
        otp
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/customer/profile/username"
    });
    expect(errorBody.message).toMatch(/username|dang nhap|tài khoản|tai khoan|mật khẩu|mat khau/i);

    const rows = await MySqlDbClient.query<{ username: string }>("SELECT username FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(rows[0]!.username).toBe(originalUsername);
  });

  test("[CUS-PRO-002] updates email with valid current password", async () => {
    const newEmail = `customer-update-${Date.now()}@example.com`;
    const response = await customerContext.put("/api/v1/customer/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail,
        password: currentPassword
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.customer.profile.email,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<{ email: string }>("SELECT email FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(rows[0]!.email).toBe(newEmail);
    tempCustomer.email = newEmail;
  });

  test("[CUS-PRO-003] rejects email update with wrong current password", async () => {
    const originalEmail = tempCustomer.email;
    const response = await customerContext.put("/api/v1/customer/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: `customer-invalid-${Date.now()}@example.com`,
        password: "wrong-password-123"
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/customer/profile/email"
    });
    expect(errorBody.message).toMatch(/password|mật khẩu|mat khau|hiện tại|hien tai|khong dung/i);

    const rows = await MySqlDbClient.query<{ email: string }>("SELECT email FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(rows[0]!.email).toBe(originalEmail);
  });

  test("[CUS-PRO-004] updates phone with valid OTP", async () => {
    await sendOtp("PROFILE_PHONE");
    const otp = await ApiOtpAccessHelper.latestOtp(customerContext, tempCustomer.email, "PROFILE_PHONE");

    const newPhone = TestDataFactory.taoSoDienThoai();
    const response = await customerContext.put("/api/v1/customer/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: newPhone,
        otp
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.customer.profile.phone,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(rows[0]!.phone).toBe(newPhone);
    tempCustomer.phone = newPhone;
  });

  test("[CUS-PRO-004A] rejects phone update with invalid OTP", async () => {
    const originalPhone = tempCustomer.phone;
    const response = await customerContext.put("/api/v1/customer/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: TestDataFactory.taoSoDienThoai(),
        otp: "111111"
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/customer/profile/phone-number"
    });
    expect(errorBody.message).toMatch(/otp|mã|ma|xác thực|xac thuc|hết hạn|het han/i);

    const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(rows[0]!.phone).toBe(originalPhone);
  });

  test("[CUS-PRO-005] updates password with valid OTP and changes DB hash", async ({ playwright }) => {
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempCustomer.id]);
    const oldHash = oldHashRows[0]!.password;

    await sendOtp("PROFILE_PASSWORD");
    const otp = await ApiOtpAccessHelper.latestOtp(customerContext, tempCustomer.email, "PROFILE_PASSWORD");

    const newPassword = "NewCustomerPwd1!";
    const response = await customerContext.put("/api/v1/customer/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
        otp
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.customer.profile.password,
      dataMode: "null"
    });

    const newHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(newHashRows[0]!.password).not.toBe(oldHash);
    const otpRow = await ApiOtpHelper.latest(tempCustomer.email, "PROFILE_PASSWORD");
    expect(otpRow?.status).toBe("USED");

    const oldLoginContext = await ApiSessionHelper.newContext(playwright);
    const newLoginContext = await ApiSessionHelper.newContext(playwright);
    try {
      const oldLogin = await ApiSessionHelper.login(oldLoginContext, tempCustomer.username, currentPassword);
      expect(oldLogin.status()).toBe(400);

      const newLogin = await ApiSessionHelper.login(newLoginContext, tempCustomer.username, newPassword);
      expect(newLogin.status()).toBe(200);
    } finally {
      await oldLoginContext.dispose();
      await newLoginContext.dispose();
    }

    currentPassword = newPassword;
  });

  test("[CUS-PRO-006] rejects password update when confirmation does not match", async () => {
    await sendOtp("PROFILE_PASSWORD");
    const otp = await ApiOtpAccessHelper.latestOtp(customerContext, tempCustomer.email, "PROFILE_PASSWORD");
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempCustomer.id]);
    const oldHash = oldHashRows[0]!.password;

    const response = await customerContext.put("/api/v1/customer/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "MismatchTarget1!",
        confirmPassword: "MismatchPassword",
        otp
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/customer/profile/password"
    });
    expect(errorBody.message).toMatch(/confirm|khớp|khop|xác nhận|xac nhan|mật khẩu xác nhận/i);

    const newHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(newHashRows[0]!.password).toBe(oldHash);
  });

  test("[CUS-PRO-007] rejects password update with invalid OTP", async () => {
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempCustomer.id]);
    const oldHash = oldHashRows[0]!.password;
    const response = await customerContext.put("/api/v1/customer/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "AnotherTarget1!",
        confirmPassword: "AnotherTarget1!",
        otp: "111111"
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/customer/profile/password"
    });
    expect(errorBody.message).toMatch(/otp|mã|ma|xác thực|xac thuc|không hợp lệ|khong hop le/i);

    const newHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM customer WHERE id = ?", [tempCustomer.id]);
    expect(newHashRows[0]!.password).toBe(oldHash);
  });
});


