import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { env } from "@config/env";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { expectStatusExact } from "@api/apiContractUtils";
import { TestDbRepository } from "@db/repositories";
import { cleanupDatabaseScope } from "@db/TestDataCleanup";
import { TestDataFactory } from "@helpers/TestDataFactory";

type AuthUser = {
  username: string;
  password: string;
  email: string;
  fullName: string;
};

test.describe("Auth - API Web Flow @api @api-write @destructive @otp @regression", () => {
  test.describe.configure({ mode: "serial" });

  let validLocalEmail = "";

  function buildAuthUser(prefix = "testuser_auth"): AuthUser {
    return {
      username: TestDataFactory.taoUsername(prefix),
      password: "Password@123",
      email: TestDataFactory.taoEmail(prefix),
      fullName: "Bot Testing"
    };
  }

  async function cleanupAuthUser(user: AuthUser): Promise<void> {
    const rows = await TestDbRepository.query<{ id: number }>(
      "SELECT id FROM customer WHERE email = ? OR username = ?",
      [user.email, user.username]
    );
    await cleanupDatabaseScope({
      customerIds: rows.map((row) => row.id),
      emails: [user.email]
    });
  }

  async function issueRegistrationTicket(request: APIRequestContext, email: string): Promise<string> {
    const sendResponse = await request.post("/auth/register/send-code", {
      form: { email },
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expectStatusExact(sendResponse, 302, "Registration OTP send should redirect to verify");

    const otp = await ApiOtpAccessHelper.latestOtp(request, email, "REGISTER");
    const verifyResponse = await request.post("/auth/register/verify", {
      form: { email, otp },
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expectStatusExact(verifyResponse, 302, "Registration OTP verify should redirect to complete");

    const ticketMatch = verifyResponse.headers().location.match(/ticket=([^&]+)/);
    expect(ticketMatch).not.toBeNull();
    return ticketMatch?.[1] ?? "";
  }

  test.beforeAll(async () => {
    const customers = await TestDbRepository.query<{ email: string }>(
      "SELECT email FROM customer WHERE username = ? LIMIT 1",
      [env.customerUsername]
    );

    if (customers.length > 0) {
      validLocalEmail = customers[0]!.email;
      return;
    }

    const staffRows = await TestDbRepository.query<{ email: string }>(
      "SELECT email FROM staff WHERE username = ? LIMIT 1",
      [env.staffUsername]
    );
    validLocalEmail = staffRows[0]?.email ?? "";
  });

  async function ensureUserRegistered(request: APIRequestContext, user: AuthUser): Promise<void> {
    const existingRows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM customer WHERE username = ? AND email = ?",
      [user.username, user.email]
    );
    if (Number(existingRows[0]?.count ?? 0) > 0) {
      return;
    }

    const ticket = await issueRegistrationTicket(request, user.email);
    const response = await request.post("/auth/register/complete", {
      form: {
        ticket,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        password: user.password,
        confirmPassword: user.password
      },
      failOnStatusCode: false,
      maxRedirects: 0
    });

    expectStatusExact(response, 302, "Registration bootstrap should redirect to login-success");
    expect(response.headers().location).toContain("/login-success");
  }

  test.describe("Auth - API Login and Authentication @api", () => {
    test("[API-TC-001] - API Authentication - Login - Valid Credentials Return JWT Cookie and Redirect @smoke", async ({
      request
    }) => {
      const response = await request.post("/login", {
        form: { username: env.adminUsername, password: env.defaultPassword },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Valid login should redirect to login-success");
      expect(response.headers().location).toContain("/login-success");

      const cookies = response.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
      expect(cookies.length).toBeGreaterThan(0);
      const cookieString = cookies.map((cookie) => cookie.value).join("; ");
      expect(cookieString).toContain("estate_access_token=");
      expect(cookieString).toContain("estate_refresh_token=");
    });

    test("[API-TC-002] - API Authentication - Login - Empty Username or Password Rejection", async ({
      request
    }) => {
      const response = await request.post("/login", {
        form: { username: "", password: "" },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Blank login should redirect with error");
      expect(response.headers().location).toContain("errorMessage");
    });

    test("[API-TC-003] - API Authentication - Login - Invalid Credentials Rejection", async ({ request }) => {
      const response = await request.post("/login", {
        form: { username: env.adminUsername, password: "bad-password-123" },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Wrong-credential login should redirect with error");
      expect(response.headers().location).toContain("errorMessage");
    });
  });

  test.describe("Auth - API Registration and Database Verification @api", () => {
    test("[API-TC-004] - API Authentication - Registration OTP - OTP Generation and Pending Verification Persistence", async ({
      request,
      cleanupRegistry
    }) => {
      const user = buildAuthUser("testuser_auth_pending");
      cleanupRegistry.addLabeled(`Cleanup auth registration OTP ${user.email}`, () => cleanupAuthUser(user));
      const response = await request.post("/auth/register/send-code", {
        form: { email: user.email },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration OTP send should redirect to verify");
      expect(response.headers().location).toContain("/register/verify");
      expect(response.headers().location).toContain("email=");

      const latest = await ApiOtpHelper.latest(user.email, "REGISTER");
      expect(latest).not.toBeNull();
      expect(latest?.status).toBe("PENDING");

    });

    test("[API-TC-005] - API Authentication - Registration OTP - Official Test Hook Verification @extended", async ({
      request,
      cleanupRegistry
    }) => {
      const user = buildAuthUser("testuser_auth_verify");
      cleanupRegistry.addLabeled(`Cleanup auth registration OTP ${user.email}`, () => cleanupAuthUser(user));
      const sendResponse = await request.post("/auth/register/send-code", {
        form: { email: user.email },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(sendResponse, 302, "Registration OTP send should redirect to verify");

      const otp = await ApiOtpAccessHelper.latestOtp(request, user.email, "REGISTER");

      const response = await request.post("/auth/register/verify", {
        form: { email: user.email, otp },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration OTP verify should redirect to complete");
      expect(response.headers().location).toContain("/register/complete");
      expect(response.headers().location).toContain("ticket=");
      expect(response.headers().location).toContain("email=");

      const ticketMatch = response.headers().location.match(/ticket=([^&]+)/);
      expect(ticketMatch).not.toBeNull();
      expect(ticketMatch?.[1] ?? "").not.toBe("");

    });

    test("[API-TC-006] - API Authentication - Registration - Successful Registration and Customer Persistence", async ({
      request,
      cleanupRegistry
    }) => {
      const user = buildAuthUser("testuser_auth_complete");
      cleanupRegistry.addLabeled(`Cleanup auth registered user ${user.email}`, () => cleanupAuthUser(user));
      const registrationTicket = await issueRegistrationTicket(request, user.email);

      const response = await request.post("/auth/register/complete", {
        form: {
          ticket: registrationTicket,
          email: user.email,
          fullName: user.fullName,
          username: user.username,
          password: user.password,
          confirmPassword: user.password
        },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration complete should redirect to login-success");
      expect(response.headers().location).toContain("/login-success");
      const cookies = response.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
      expect(cookies.length).toBeGreaterThan(0);

      const createdRows = await TestDbRepository.query<{ username: string; email: string }>(
        "SELECT username, email FROM customer WHERE username = ? AND email = ?",
        [user.username, user.email]
      );
      expect(createdRows.length).toBe(1);

    });

    test("[API-TC-007] - API Authentication - Registration - Password Confirmation Mismatch Rejection", async ({
      request,
      cleanupRegistry
    }) => {
      const isolatedUser: AuthUser = {
        username: TestDataFactory.taoUsername("testuserauthmismatch"),
        password: "Password@123",
        email: TestDataFactory.taoEmail("testauth-mismatch"),
        fullName: "Bot Testing"
      };
      cleanupRegistry.addLabeled(`Cleanup auth mismatch user ${isolatedUser.email}`, () => cleanupAuthUser(isolatedUser));
      const mismatchTicket = await issueRegistrationTicket(request, isolatedUser.email);

      const response = await request.post("/auth/register/complete", {
        form: {
          ticket: mismatchTicket,
          email: isolatedUser.email,
          fullName: isolatedUser.fullName,
          username: `${isolatedUser.username}_failed`,
          password: isolatedUser.password,
          confirmPassword: "WrongConfirm!"
        },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration complete mismatch should redirect with error");
      expect(response.headers().location).toContain("/register/complete");
      expect(response.headers().location).toContain("errorMessage");

      const createdRows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM customer WHERE email = ? OR username = ?",
        [isolatedUser.email, `${isolatedUser.username}_failed`]
      );
      expect(Number(createdRows[0]?.count ?? 0)).toBe(0);

    });
  });

  test.describe("Auth - API Forgot Password and Reset @api", () => {
    test("[API-TC-008] - API Authentication - Forgot Password - OTP Generation and Database Persistence", async ({
      request
    }) => {
      expect(validLocalEmail).toBeTruthy();
      const baselineVerificationId = await ApiOtpHelper.latestVerificationId(validLocalEmail, "RESET_PASSWORD");
      try {
        const response = await request.post("/api/v1/auth/forgot-password", {
          params: { email: validLocalEmail },
          failOnStatusCode: false,
          maxRedirects: 0
        });
        expectStatusExact(response, 200, "Forgot-password API should generate a reset OTP");

        const rows = await TestDbRepository.query<{ id: number; email: string; purpose: string; status: string }>(
          `
            SELECT id, email, purpose, status
            FROM email_verification
            WHERE email = ? AND purpose = ?
            ORDER BY id DESC
            LIMIT 1
          `,
          [validLocalEmail, "RESET_PASSWORD"]
        );
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]!.status).toBe("PENDING");
      } finally {
        await ApiOtpHelper.deleteVerificationsAfter(validLocalEmail, "RESET_PASSWORD", baselineVerificationId);
      }
    });

    test("[API-TC-009] - API Authentication - Password Reset - Invalid OTP Rejection @extended", async ({ request }) => {
      expect(validLocalEmail).toBeTruthy();
      const baselineVerificationId = await ApiOtpHelper.latestVerificationId(validLocalEmail, "RESET_PASSWORD");
      try {
        await request.post("/api/v1/auth/forgot-password", {
          params: { email: validLocalEmail },
          failOnStatusCode: false,
          maxRedirects: 0
        });

        const response = await request.post("/auth/reset-password", {
          form: {
            email: validLocalEmail,
            otp: "000000",
            newPassword: "NewPassword123",
            confirmPassword: "NewPassword123"
          },
          failOnStatusCode: false,
          maxRedirects: 0
        });

        expectStatusExact(response, 302, "Reset password with invalid OTP should redirect with error");
        expect(response.headers().location).toContain("/auth/reset-password");
        expect(response.headers().location).toContain("errorMessage");
      } finally {
        await ApiOtpHelper.deleteVerificationsAfter(validLocalEmail, "RESET_PASSWORD", baselineVerificationId);
      }
    });

    test("[API-TC-011] - API Authentication - Password Reset - Successful Reset and Login Data Update", async ({
      request,
      cleanupRegistry
    }) => {
      const user = buildAuthUser("testuser_auth_reset");
      cleanupRegistry.addLabeled(`Cleanup auth reset user ${user.email}`, () => cleanupAuthUser(user));
      await ensureUserRegistered(request, user);
      const nextPassword = "Password@456";

      const forgotPasswordResponse = await request.post("/api/v1/auth/forgot-password", {
        params: { email: user.email },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(forgotPasswordResponse, 200, "API forgot-password should succeed");

      const otp = await ApiOtpAccessHelper.latestOtp(request, user.email, "RESET_PASSWORD");

      const response = await request.post("/auth/reset-password", {
        form: {
          email: user.email,
          otp,
          newPassword: nextPassword,
          confirmPassword: nextPassword
        },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Reset password success should redirect to login");
      expect(response.headers().location).toContain("/login");
      expect(response.headers().location).toContain("successMessage");

      const oldLogin = await request.post("/login", {
        form: { username: user.username, password: user.password },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(oldLogin, 302, "Old password login should redirect with error");
      expect(oldLogin.headers().location).toContain("errorMessage");

      const newLogin = await request.post("/login", {
        form: { username: user.username, password: nextPassword },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(newLogin, 302, "New password login should redirect to success");
      expect(newLogin.headers().location).toContain("/login-success");

    });
  });

  test.describe("Auth - API Logout @api", () => {
    test("[API-TC-010] - API Authentication - Logout - Authentication Cookie Clearance and Login Redirect @smoke", async ({
      request
    }) => {
      const loginResponse = await request.post("/login", {
        form: { username: env.adminUsername, password: env.defaultPassword },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(loginResponse, 302, "Pre-logout login should redirect");

      const response = await request.post("/auth/logout", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 302, "Logout should redirect to login");
      expect(response.headers().location).toContain("/login?logout");

      const cookies = response.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
      if (cookies.length > 0) {
        const cookieString = cookies.map((cookie) => cookie.value).join("; ");
        expect(cookieString.toLowerCase()).toContain("max-age=0");
      }
    });
  });
});
