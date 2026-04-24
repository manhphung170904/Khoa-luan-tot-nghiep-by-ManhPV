import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { env } from "@config/env";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";

type TempAdmin = {
  id: number;
  username: string;
  email: string;
  phone: string;
};

type ExistingIdentity = {
  username: string;
  email: string;
  phone: string;
};

test.describe.serial("Admin - API Profile @api-write @otp @regression", () => {
  let bootstrapAdminContext: APIRequestContext;
  let tempAdminContext: APIRequestContext;
  let tempAdmin: TempAdmin;
  let existingIdentity: ExistingIdentity;
  let currentPassword = env.defaultPassword;

  const createTempAdmin = async (): Promise<TempAdmin> => {
    const username = `adm${Date.now().toString().slice(-7)}`;
    const email = `pw-admin-profile-${Date.now()}@example.com`;
    const phone = `0${String(Date.now()).slice(-9)}`;

    const createResponse = await bootstrapAdminContext.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: {
        username,
        password: env.defaultPassword,
        fullName: `PW Admin Profile ${Date.now()}`,
        phone,
        email,
        role: "ADMIN"
      }
    });

    await expectApiMessage(createResponse, {
      status: 200,
      message: apiExpectedMessages.admin.staff.create,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<TempAdmin>(
      `
        SELECT id, username, email, phone
        FROM staff
        WHERE username = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [username]
    );

    expect(rows.length).toBe(1);
    return rows[0]!;
  };

  const sendOtp = async (purpose: string) => {
    const response = await tempAdminContext.post(`/api/v1/admin/profile/otp/${purpose}`, {
      failOnStatusCode: false
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.profile.otp,
      dataMode: "null"
    });
  };

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminContext = await ApiSessionHelper.newContext(playwright, "admin");
    tempAdmin = await createTempAdmin();
    const existingIdentityRows = await MySqlDbClient.query<ExistingIdentity>(
      `
        SELECT username, email, phone
        FROM staff
        WHERE id <> ?
          AND username IS NOT NULL AND username <> ''
          AND email IS NOT NULL AND email <> ''
          AND phone IS NOT NULL AND phone <> ''
        ORDER BY id ASC
        LIMIT 1
      `,
      [tempAdmin.id]
    );
    expect(existingIdentityRows.length).toBe(1);
    existingIdentity = existingIdentityRows[0]!;
    tempAdminContext = await ApiSessionHelper.newContext(playwright);

    const loginResponse = await ApiSessionHelper.login(tempAdminContext, tempAdmin.username, currentPassword);
    expect(loginResponse.status()).toBe(200);
  });

  test.afterAll(async () => {
    await tempAdminContext.dispose();

    if (tempAdmin?.id) {
      await bootstrapAdminContext.delete(`/api/v1/admin/staff/${tempAdmin.id}`, {
        failOnStatusCode: false
      });
    }

    await bootstrapAdminContext.dispose();
  });

  test("[PRF-005] - API Admin Profile - Email - Update Without Login Rejection", async ({ request }) => {
    const response = await request.put("/api/v1/admin/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: "hacked@example.com",
        password: "wrong-password"
      }
    });

    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/profile/email"
    });
  });

  test("[PRF-006] - API Admin Profile - Username - Update Without Login Rejection", async ({ request }) => {
    const response = await request.put("/api/v1/admin/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: "admin_hacked",
        otp: "000000"
      }
    });

    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/profile/username"
    });
  });

  test("[PRF-007] - API Admin Profile - Password - Update Without Login Rejection", async ({ request }) => {
    const response = await request.put("/api/v1/admin/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
        otp: "000000"
      }
    });

    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/profile/password"
    });
  });

  test("[PRF-009] - API Admin Profile - Phone Number - Update Without Login Rejection", async ({ request }) => {
    const response = await request.put("/api/v1/admin/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: "0900000000",
        otp: "000000"
      }
    });

    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/profile/phone-number"
    });
  });

  test("[PRF-001] - API Admin Profile - Username OTP - OTP Generation and Pending Record Persistence", async () => {
    await sendOtp("PROFILE_USERNAME");

    const latest = await ApiOtpHelper.latest(tempAdmin.email, "PROFILE_USERNAME");
    expect(latest).not.toBeNull();
    expect(latest?.status).toBe("PENDING");
  });

  test("[PRF-008] - API Admin Profile - OTP Purpose - Arbitrary Nonblank Purpose Acceptance", async () => {
    const purpose = `PROFILE_CUSTOM_${Date.now()}`;
    await sendOtp(purpose);

    const latest = await ApiOtpHelper.latest(tempAdmin.email, purpose);
    expect(latest).not.toBeNull();
    expect(latest?.status).toBe("PENDING");
  });

  test("[PRF-002] - API Admin Profile - Username - Invalid OTP Rejection", async () => {
    const originalRows = await MySqlDbClient.query<{ username: string }>(
      "SELECT username FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    const response = await tempAdminContext.put("/api/v1/admin/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: `admin-updated-${Date.now()}`,
        otp: "111111"
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/username"
    });
    expect(errorBody.message).toMatch(/otp|mã|xác thực|không hợp lệ/i);

    const latestRows = await MySqlDbClient.query<{ username: string }>(
      "SELECT username FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.username).toBe(originalRows[0]?.username);
  });

  test("[PRF-011] - API Admin Profile - Username - Successful Update with Valid OTP", async () => {
    await sendOtp("PROFILE_USERNAME");
    const otp = await ApiOtpAccessHelper.latestOtp(tempAdminContext, tempAdmin.email, "PROFILE_USERNAME");

    const nextUsername = `adm${Date.now().toString().slice(-7)}`;
    const response = await tempAdminContext.put("/api/v1/admin/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: nextUsername,
        otp
      }
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.profile.username,
      dataMode: "null"
    });

    const staffRows = await MySqlDbClient.query<{ username: string }>(
      "SELECT username FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(staffRows[0]?.username).toBe(nextUsername);

    const otpRow = await ApiOtpHelper.latest(tempAdmin.email, "PROFILE_USERNAME");
    expect(otpRow?.status).toBe("USED");

    tempAdmin.username = nextUsername;
  });

  test("[PRF-015] - API Admin Profile - Username - Duplicate Username Rejection with Valid OTP", async () => {
    await sendOtp("PROFILE_USERNAME");
    const otp = await ApiOtpAccessHelper.latestOtp(tempAdminContext, tempAdmin.email, "PROFILE_USERNAME");

    const response = await tempAdminContext.put("/api/v1/admin/profile/username", {
      failOnStatusCode: false,
      data: {
        newUsername: existingIdentity.username,
        otp
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/username"
    });
    expect(errorBody.message).toMatch(/username|tên đăng nhập|đăng nhập|đã được sử dụng|tồn tại|trùng/i);

    const latestRows = await MySqlDbClient.query<{ username: string }>(
      "SELECT username FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.username).toBe(tempAdmin.username);
  });

  test("[PRF-003] - API Admin Profile - Phone Number - Invalid OTP Rejection", async () => {
    const originalRows = await MySqlDbClient.query<{ phone: string }>(
      "SELECT phone FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    const response = await tempAdminContext.put("/api/v1/admin/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: "0900001234",
        otp: "111111"
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/phone-number"
    });
    expect(errorBody.message).toMatch(/otp|mã|xác thực|hết hạn|không tìm thấy/i);

    const latestRows = await MySqlDbClient.query<{ phone: string }>(
      "SELECT phone FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.phone).toBe(originalRows[0]?.phone);
  });

  test("[PRF-012] - API Admin Profile - Phone Number - Successful Update with Valid OTP", async () => {
    await sendOtp("PROFILE_PHONE");
    const otp = await ApiOtpAccessHelper.latestOtp(tempAdminContext, tempAdmin.email, "PROFILE_PHONE");

    const nextPhone = `0${String(Date.now()).slice(-9)}`;
    const response = await tempAdminContext.put("/api/v1/admin/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: nextPhone,
        otp
      }
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.profile.phone,
      dataMode: "null"
    });

    const staffRows = await MySqlDbClient.query<{ phone: string }>(
      "SELECT phone FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(staffRows[0]?.phone).toBe(nextPhone);

    const otpRow = await ApiOtpHelper.latest(tempAdmin.email, "PROFILE_PHONE");
    expect(otpRow?.status).toBe("USED");

    tempAdmin.phone = nextPhone;
  });

  test("[PRF-016] - API Admin Profile - Phone Number - Duplicate Phone Rejection with Valid OTP", async () => {
    await sendOtp("PROFILE_PHONE");
    const otp = await ApiOtpAccessHelper.latestOtp(tempAdminContext, tempAdmin.email, "PROFILE_PHONE");

    const response = await tempAdminContext.put("/api/v1/admin/profile/phone-number", {
      failOnStatusCode: false,
      data: {
        newPhoneNumber: existingIdentity.phone,
        otp
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/phone-number"
    });
    expect(errorBody.message).toMatch(/phone|điện thoại|đã được sử dụng|tồn tại|trùng/i);

    const latestRows = await MySqlDbClient.query<{ phone: string }>(
      "SELECT phone FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.phone).toBe(tempAdmin.phone);
  });

  test("[PRF-004] - API Admin Profile - Email - Incorrect Current Password Rejection", async () => {
    const originalRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    const response = await tempAdminContext.put("/api/v1/admin/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: `admin.updated.${Date.now()}@example.com`,
        password: "incorrect-password"
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/email"
    });
    expect(errorBody.message).toMatch(/password|mật khẩu|hiện tại|incorrect|không đúng|sai/i);

    const latestRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.email).toBe(originalRows[0]?.email);
  });

  test("[PRF-014] - API Admin Profile - Email - Successful Update with Valid Current Password", async () => {
    const nextEmail = `pw-admin-profile-updated-${Date.now()}@example.com`;
    const response = await tempAdminContext.put("/api/v1/admin/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: nextEmail,
        password: currentPassword
      }
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.profile.email,
      dataMode: "null"
    });

    const staffRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(staffRows[0]?.email).toBe(nextEmail);

    tempAdmin.email = nextEmail;
  });

  test("[PRF-017] - API Admin Profile - Email - Duplicate Email Rejection with Valid Current Password", async () => {
    const response = await tempAdminContext.put("/api/v1/admin/profile/email", {
      failOnStatusCode: false,
      data: {
        newEmail: existingIdentity.email,
        password: currentPassword
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/email"
    });
    expect(errorBody.message).toMatch(/email|tồn tại|trùng/i);

    const latestRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.email).toBe(tempAdmin.email);
  });

  test("[PRF-010] - API Admin Profile - Password - Invalid OTP Rejection", async () => {
    const originalRows = await MySqlDbClient.query<{ password: string }>(
      "SELECT password FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    const response = await tempAdminContext.put("/api/v1/admin/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
        otp: "111111"
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/profile/password"
    });
    expect(errorBody.message).toMatch(/otp|mã|xác thực|hết hạn|không tìm thấy/i);

    const latestRows = await MySqlDbClient.query<{ password: string }>(
      "SELECT password FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.password).toBe(originalRows[0]?.password);
  });

  test("[PRF-013] - API Admin Profile - Password - Successful Update with Valid OTP and OTP Consumption", async ({ playwright }) => {
    await sendOtp("PROFILE_PASSWORD");
    const otp = await ApiOtpAccessHelper.latestOtp(tempAdminContext, tempAdmin.email, "PROFILE_PASSWORD");
    const nextPassword = "NewPassword123!";

    const response = await tempAdminContext.put("/api/v1/admin/profile/password", {
      failOnStatusCode: false,
      data: {
        currentPassword,
        newPassword: nextPassword,
        confirmPassword: nextPassword,
        otp
      }
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.profile.password,
      dataMode: "null"
    });

    const otpRow = await ApiOtpHelper.latest(tempAdmin.email, "PROFILE_PASSWORD");
    expect(otpRow?.status).toBe("USED");

    const oldLoginContext = await ApiSessionHelper.newContext(playwright);
    const newLoginContext = await ApiSessionHelper.newContext(playwright);
    try {
      const oldLogin = await ApiSessionHelper.login(oldLoginContext, tempAdmin.username, currentPassword);
      expect(oldLogin.status()).toBe(400);

      const newLogin = await ApiSessionHelper.login(newLoginContext, tempAdmin.username, nextPassword);
      expect(newLogin.status()).toBe(200);
    } finally {
      await oldLoginContext.dispose();
      await newLoginContext.dispose();
    }

    currentPassword = nextPassword;
  });
});




