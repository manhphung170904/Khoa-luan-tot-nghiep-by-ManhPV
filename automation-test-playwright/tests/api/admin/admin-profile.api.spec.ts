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

test.describe.serial("Admin Profile API Tests @api @api-write @otp @regression", () => {
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
    await MySqlDbClient.close();
  });

  test("[PRF_005] PUT /email rejects anonymous access", async ({ request }) => {
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

  test("[PRF_006] PUT /username rejects anonymous access", async ({ request }) => {
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

  test("[PRF_007] PUT /password rejects anonymous access", async ({ request }) => {
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

  test("[PRF_009] PUT /phone-number rejects anonymous access", async ({ request }) => {
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

  test("[PRF_001] POST /otp/{purpose} sends OTP for profile username and persists pending row", async () => {
    await sendOtp("PROFILE_USERNAME");

    const latest = await ApiOtpHelper.latest(tempAdmin.email, "PROFILE_USERNAME");
    expect(latest).not.toBeNull();
    expect(latest?.status).toBe("PENDING");
  });

  test("[PRF_008] POST /otp/{purpose} currently accepts arbitrary non-blank purpose", async () => {
    const purpose = `PROFILE_CUSTOM_${Date.now()}`;
    await sendOtp(purpose);

    const latest = await ApiOtpHelper.latest(tempAdmin.email, purpose);
    expect(latest).not.toBeNull();
    expect(latest?.status).toBe("PENDING");
  });

  test("[PRF_002] PUT /username rejects invalid OTP", async () => {
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
    expect(errorBody.message).toMatch(/otp|mã|ma|xác thực|xac thuc|không hợp lệ|khong hop le/i);

    const latestRows = await MySqlDbClient.query<{ username: string }>(
      "SELECT username FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.username).toBe(originalRows[0]?.username);
  });

  test("[PRF_011] PUT /username updates username when OTP is valid", async () => {
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

  test("[PRF_015] PUT /username rejects duplicate username even with valid OTP", async () => {
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
    expect(errorBody.message).toMatch(/username|tên đăng nhập|ten dang nhap|dang nhap|đã được sử dụng|da duoc su dung|ton tai|trung/i);

    const latestRows = await MySqlDbClient.query<{ username: string }>(
      "SELECT username FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.username).toBe(tempAdmin.username);
  });

  test("[PRF_003] PUT /phone-number rejects invalid OTP", async () => {
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
    expect(errorBody.message).toMatch(/otp|mã|ma|xác thực|xac thuc|hết hạn|het han|không tìm thấy|khong tim thay/i);

    const latestRows = await MySqlDbClient.query<{ phone: string }>(
      "SELECT phone FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.phone).toBe(originalRows[0]?.phone);
  });

  test("[PRF_012] PUT /phone-number updates phone when OTP is valid", async () => {
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

  test("[PRF_016] PUT /phone-number rejects duplicate phone even with valid OTP", async () => {
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
    expect(errorBody.message).toMatch(/phone|điện thoại|dien thoai|đã được sử dụng|da duoc su dung|tồn tại|ton tai|trùng|trung/i);

    const latestRows = await MySqlDbClient.query<{ phone: string }>(
      "SELECT phone FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.phone).toBe(tempAdmin.phone);
  });

  test("[PRF_004] PUT /email rejects incorrect current password", async () => {
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
    expect(errorBody.message).toMatch(/password|mat khau|mật khẩu|hien tai|hiện tại|incorrect|khong dung|không đúng|sai/i);

    const latestRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.email).toBe(originalRows[0]?.email);
  });

  test("[PRF_014] PUT /email updates email when current password is valid", async () => {
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

  test("[PRF_017] PUT /email rejects duplicate email with correct current password", async () => {
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
    expect(errorBody.message).toMatch(/email|ton tai|trung/i);

    const latestRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.email).toBe(tempAdmin.email);
  });

  test("[PRF_010] PUT /password rejects invalid OTP", async () => {
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
    expect(errorBody.message).toMatch(/otp|ma|mã|xac thuc|xác thực|het han|hết hạn|khong tim thay|không tìm thấy/i);

    const latestRows = await MySqlDbClient.query<{ password: string }>(
      "SELECT password FROM staff WHERE id = ? LIMIT 1",
      [tempAdmin.id]
    );
    expect(latestRows[0]?.password).toBe(originalRows[0]?.password);
  });

  test("[PRF_013] PUT /password updates password when OTP is valid and marks OTP used", async ({ playwright }) => {
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


