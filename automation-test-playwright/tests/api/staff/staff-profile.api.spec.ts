import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { env } from "@config/env";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";

type TempStaff = {
  id: number;
  username: string;
  email: string;
  phone: string;
};

test.describe("Staff - API Profile @api-write @otp @regression", () => {
  let bootstrapAdmin: APIRequestContext;
  let staffContext: APIRequestContext;
  let tempStaff: TempStaff;
  let currentPassword: string;

  const createTempStaff = async (): Promise<TempStaff> => {
    const payload = TestDataFactory.buildAdminStaffPayload();
    const response = await bootstrapAdmin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: payload
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.staff.create,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<TempStaff>(
      `
        SELECT id, username, email, phone
        FROM staff
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
    const response = await staffContext.post(`/api/v1/staff/profile/otp/${purpose}`, {
      failOnStatusCode: false
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.profile.otp,
      dataMode: "null"
    });
  };

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdmin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.beforeEach(async ({ playwright }) => {
    tempStaff = await createTempStaff();
    staffContext = await ApiSessionHelper.newContext(playwright);
    currentPassword = env.defaultPassword;

    const loginResponse = await ApiSessionHelper.login(staffContext, tempStaff.username, currentPassword);
    expect(loginResponse.status()).toBe(200);
  });

  test.afterEach(async () => {
    await staffContext.dispose();
    await bootstrapAdmin.delete(`/api/v1/admin/staff/${tempStaff.id}`, { failOnStatusCode: false });
  });

  test.afterAll(async () => {
    await bootstrapAdmin.dispose();
  });

  test("[STF-PRO-001] - API Staff Profile - Authentication - Mutation Endpoint Access Without Login Rejection", async ({ request }) => {
    const usernameResponse = await request.put("/api/v1/staff/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: "staff_hacked",
        otp: "000000"
      }
    });
    await expectApiErrorBody(usernameResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/staff/profile/username"
    });

    const emailResponse = await request.put("/api/v1/staff/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: "hacked@example.com",
        password: "wrong-password"
      }
    });
    await expectApiErrorBody(emailResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/staff/profile/email"
    });

    const phoneResponse = await request.put("/api/v1/staff/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: "0900000000",
        otp: "000000"
      }
    });
    await expectApiErrorBody(phoneResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/staff/profile/phone-number"
    });

    const otpResponse = await request.post("/api/v1/staff/profile/otp/PROFILE_USERNAME", {
      failOnStatusCode: false
    });
    await expectApiErrorBody(otpResponse, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/staff/profile/otp/PROFILE_USERNAME"
    });
  });

  test("[STF-PRO-002] - API Staff Profile - Username OTP - OTP Generation and Pending Record Persistence", async () => {
    await sendOtp("PROFILE_USERNAME");
    const latest = await ApiOtpHelper.latest(tempStaff.email, "PROFILE_USERNAME");
    expect(latest?.status).toBe("PENDING");
  });

  test("[STF-PRO-003] - API Staff Profile - Username - Invalid OTP Rejection", async () => {
    const originalUsername = tempStaff.username;
    const response = await staffContext.put("/api/v1/staff/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: TestDataFactory.taoUsername("staff-updated"),
        otp: "111111"
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/username"
    });
    expect(errorBody.message).toMatch(/otp|mã|ma|xác thực|xac thuc/i);

    const rows = await MySqlDbClient.query<{ username: string }>("SELECT username FROM staff WHERE id = ?", [tempStaff.id]);
    expect(rows[0]!.username).toBe(originalUsername);
  });

  test("[STF-PRO-004] - API Staff Profile - Username - Successful Update with Valid OTP", async () => {
    await sendOtp("PROFILE_USERNAME");
    const otp = await ApiOtpAccessHelper.latestOtp(staffContext, tempStaff.email, "PROFILE_USERNAME");

    const nextUsername = TestDataFactory.taoUsername("stf");
    const response = await staffContext.put("/api/v1/staff/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: nextUsername,
        otp
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.profile.username,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<{ username: string }>("SELECT username FROM staff WHERE id = ?", [tempStaff.id]);
    expect(rows[0]!.username).toBe(nextUsername);
    tempStaff.username = nextUsername;
  });

  test("[STF-PRO-005] - API Staff Profile - Email - Incorrect Current Password Rejection", async () => {
    const originalEmail = tempStaff.email;
    const response = await staffContext.put("/api/v1/staff/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: TestDataFactory.taoEmail("staff-invalid"),
        password: "wrong-password"
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/email"
    });
    expect(errorBody.message).toMatch(/password|mật khẩu|mat khau|hiện tại|hien tai|không đúng|khong dung/i);

    const rows = await MySqlDbClient.query<{ email: string }>("SELECT email FROM staff WHERE id = ?", [tempStaff.id]);
    expect(rows[0]!.email).toBe(originalEmail);
  });

  test("[STF-PRO-006] - API Staff Profile - Email - Successful Update with Valid Current Password", async () => {
    const newEmail = TestDataFactory.taoEmail("staff-update");
    const response = await staffContext.put("/api/v1/staff/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail,
        password: currentPassword
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.profile.email,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<{ email: string }>("SELECT email FROM staff WHERE id = ?", [tempStaff.id]);
    expect(rows[0]!.email).toBe(newEmail);
    tempStaff.email = newEmail;
  });

  test("[STF-PRO-007] - API Staff Profile - Phone Number - Successful Update with Valid OTP", async () => {
    await sendOtp("PROFILE_PHONE");
    const otp = await ApiOtpAccessHelper.latestOtp(staffContext, tempStaff.email, "PROFILE_PHONE");

    const nextPhone = TestDataFactory.taoSoDienThoai();
    const response = await staffContext.put("/api/v1/staff/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: nextPhone,
        otp
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.profile.phone,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM staff WHERE id = ?", [tempStaff.id]);
    expect(rows[0]!.phone).toBe(nextPhone);
    tempStaff.phone = nextPhone;
  });

  test("[STF-PRO-007A] - API Staff Profile - Phone Number - Invalid OTP Rejection", async () => {
    const originalPhone = tempStaff.phone;
    const response = await staffContext.put("/api/v1/staff/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: TestDataFactory.taoSoDienThoai(),
        otp: "111111"
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/phone-number"
    });
    expect(errorBody.message).toMatch(/otp|mã|ma|xác thực|xac thuc|hết hạn|het han/i);

    const rows = await MySqlDbClient.query<{ phone: string }>("SELECT phone FROM staff WHERE id = ?", [tempStaff.id]);
    expect(rows[0]!.phone).toBe(originalPhone);
  });

  test("[STF-PRO-008] - API Staff Profile - Password - Minimum Length Validation", async () => {
    await sendOtp("PROFILE_PASSWORD");
    const otp = await ApiOtpAccessHelper.latestOtp(staffContext, tempStaff.email, "PROFILE_PASSWORD");
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempStaff.id]);
    const oldHash = oldHashRows[0]!.password;

    const response = await staffContext.put("/api/v1/staff/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "short",
        confirmPassword: "short",
        otp
      }
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/password"
    });
    expect(errorBody.message).toMatch(/short|ngắn|ngan|ít nhất|it nhat|min|ký tự|ky tu/i);

    const newHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempStaff.id]);
    expect(newHashRows[0]!.password).toBe(oldHash);
  });

  test("[STF-PRO-009] - API Staff Profile - Password - Successful Update with Valid OTP", async ({ playwright }) => {
    const oldHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempStaff.id]);
    const oldHash = oldHashRows[0]!.password;

    await sendOtp("PROFILE_PASSWORD");
    const otp = await ApiOtpAccessHelper.latestOtp(staffContext, tempStaff.email, "PROFILE_PASSWORD");

    const newPassword = "NewStaffPassword1!";
    const response = await staffContext.put("/api/v1/staff/profile/password", {
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
      message: apiExpectedMessages.staff.profile.password,
      dataMode: "null"
    });

    const newHashRows = await MySqlDbClient.query<{ password: string }>("SELECT password FROM staff WHERE id = ?", [tempStaff.id]);
    expect(newHashRows[0]!.password).not.toBe(oldHash);
    const otpRow = await ApiOtpHelper.latest(tempStaff.email, "PROFILE_PASSWORD");
    expect(otpRow?.status).toBe("USED");

    const oldLoginContext = await ApiSessionHelper.newContext(playwright);
    const newLoginContext = await ApiSessionHelper.newContext(playwright);
    try {
      const oldLogin = await ApiSessionHelper.login(oldLoginContext, tempStaff.username, currentPassword);
      expect(oldLogin.status()).toBe(400);

      const newLogin = await ApiSessionHelper.login(newLoginContext, tempStaff.username, newPassword);
      expect(newLogin.status()).toBe(200);
    } finally {
      await oldLoginContext.dispose();
      await newLoginContext.dispose();
    }
  });
});
