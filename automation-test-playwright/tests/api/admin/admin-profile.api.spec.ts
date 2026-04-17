import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";

test.describe("Admin Profile API Tests @api @regression", () => {
  let adminCookies: string;

  test.beforeAll(async () => {
    adminCookies = await ApiAuthHelper.loginAsAdmin();
  });

  test.describe("Profile Updates & OTP", () => {
    test("[PRF_005] PUT /email rejects anonymous access", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/email", {
        data: {
          newEmail: "hacked@example.com",
          password: "wrong-password"
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[PRF_006] PUT /username rejects anonymous access", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/username", {
        data: {
          newUsername: "admin_hacked",
          otp: "000000"
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[PRF_007] PUT /password rejects anonymous access", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/password", {
        data: {
          currentPassword: "password123",
          newPassword: "newpassword",
          confirmPassword: "newpassword",
          otp: "000000"
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[PRF_009] PUT /phone-number rejects anonymous access", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/phone-number", {
        data: {
          newPhoneNumber: "0900000000",
          otp: "000000"
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[PRF_001] POST /otp/{purpose} sends OTP for email update", async ({ request }) => {
      const response = await request.post("/api/v1/admin/profile/otp/email_update", {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
    });

    test("[PRF_008] POST /otp/{purpose} accepts non-empty custom purpose", async ({ request }) => {
      const response = await request.post("/api/v1/admin/profile/otp/INVALID_PURPOSE", {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
    });

    test("[PRF_002] PUT /username rejects invalid OTP", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/username", {
        headers: { Cookie: adminCookies },
        data: {
          newUsername: "admin_updated",
          otp: "invalid_otp_00"
        }
      });

      expect(response.status()).toBe(400);
    });

    test("[PRF_003] PUT /phone-number rejects invalid OTP", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/phone-number", {
        headers: { Cookie: adminCookies },
        data: {
          newPhoneNumber: "0900001234",
          otp: "invalid_otp_00"
        }
      });

      expect(response.status()).toBe(400);
    });

    test("[PRF_004] PUT /email rejects incorrect current password", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/email", {
        headers: { Cookie: adminCookies },
        data: {
          newEmail: "admin.updated@example.com",
          password: "incorrect-password"
        }
      });

      expect(response.status()).toBe(400);
    });

    test("[PRF_010] PUT /password rejects invalid OTP", async ({ request }) => {
      const response = await request.put("/api/v1/admin/profile/password", {
        headers: { Cookie: adminCookies },
        data: {
          currentPassword: "12345678",
          newPassword: "12345678",
          confirmPassword: "12345678",
          otp: "invalid_otp_00"
        }
      });

      expect(response.status()).toBe(400);
    });
  });
});
