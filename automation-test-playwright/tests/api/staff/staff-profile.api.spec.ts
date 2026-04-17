import { expect, test, type APIRequestContext } from "@playwright/test";
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

test.describe.serial("Staff Profile API Tests @api @api-write @otp @regression", () => {
  let bootstrapAdmin: APIRequestContext;
  let staffContext: APIRequestContext;
  let tempStaff: TempStaff;
  let currentPassword = env.defaultPassword;

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
    tempStaff = await createTempStaff();
    staffContext = await ApiSessionHelper.newContext(playwright);

    const loginResponse = await ApiSessionHelper.login(staffContext, tempStaff.username, currentPassword);
    expect(loginResponse.status()).toBe(200);
  });

  test.afterAll(async () => {
    await staffContext.dispose();
    await bootstrapAdmin.delete(`/api/v1/admin/staff/${tempStaff.id}`, { failOnStatusCode: false });
    await bootstrapAdmin.dispose();
    await MySqlDbClient.close();
  });

  test("[STF-PRO-001] rejects anonymous access to staff profile mutation endpoints", async ({ request }) => {
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

  test("[STF-PRO-002] sends OTP for username update and marks row pending", async () => {
    await sendOtp("PROFILE_USERNAME");
    const latest = await ApiOtpHelper.latest(tempStaff.email, "PROFILE_USERNAME");
    expect(latest?.status).toBe("PENDING");
  });

  test("[STF-PRO-003] rejects invalid OTP for username update", async () => {
    const response = await staffContext.put("/api/v1/staff/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: `staff-updated-${Date.now()}`,
        otp: "111111"
      }
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/username"
    });
  });

  test("[STF-PRO-004] updates username with valid OTP", async () => {
    await sendOtp("PROFILE_USERNAME");
    const otp = await ApiOtpAccessHelper.latestOtp(staffContext, tempStaff.email, "PROFILE_USERNAME");

    const nextUsername = `stf${Date.now().toString().slice(-7)}`;
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

  test("[STF-PRO-005] rejects email update with wrong current password", async () => {
    const response = await staffContext.put("/api/v1/staff/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: `staff-invalid-${Date.now()}@example.com`,
        password: "wrong-password"
      }
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/email"
    });
  });

  test("[STF-PRO-006] updates email with valid current password", async () => {
    const newEmail = `staff-update-${Date.now()}@example.com`;
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

  test("[STF-PRO-007] updates phone with valid OTP", async () => {
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

  test("[STF-PRO-007A] rejects phone update with invalid OTP", async () => {
    const response = await staffContext.put("/api/v1/staff/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: TestDataFactory.taoSoDienThoai(),
        otp: "111111"
      }
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/phone-number"
    });
  });

  test("[STF-PRO-008] rejects password update when new password is too short", async () => {
    await sendOtp("PROFILE_PASSWORD");
    const otp = await ApiOtpAccessHelper.latestOtp(staffContext, tempStaff.email, "PROFILE_PASSWORD");

    const response = await staffContext.put("/api/v1/staff/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "short",
        confirmPassword: "short",
        otp
      }
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/staff/profile/password"
    });
  });

  test("[STF-PRO-009] updates password with valid OTP", async ({ playwright }) => {
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

    currentPassword = newPassword;
  });
});
