import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { env } from "@config/env";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { expectStatusExact } from "@api/apiContractUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";

test.describe("Auth - API Web Flow @api-write @otp @regression", () => {
  const validUser = {
    username: `testuser_auth_${Date.now()}`,
    password: "Password@123",
    email: `testauth_${Date.now()}@example.com`,
    fullName: "Bot Testing"
  };

  let validLocalEmail = "";
  let registrationTicket = "";

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
    const customers = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM customer WHERE username = ? LIMIT 1",
      [env.customerUsername]
    );

    if (customers.length > 0) {
      validLocalEmail = customers[0]!.email;
      return;
    }

    const staffRows = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM staff WHERE username = ? LIMIT 1",
      [env.staffUsername]
    );
    validLocalEmail = staffRows[0]?.email ?? "";
  });

  test.afterAll(async () => {
    await MySqlDbClient.execute("DELETE FROM customer WHERE email = ?", [validUser.email]);
    await MySqlDbClient.execute("DELETE FROM email_verification WHERE email = ?", [validUser.email]);
  });

  async function ensureValidUserRegistered(request: APIRequestContext): Promise<void> {
    const existingRows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM customer WHERE username = ? AND email = ?",
      [validUser.username, validUser.email]
    );
    if (Number(existingRows[0]?.count ?? 0) > 0) {
      return;
    }

    const ticket = await issueRegistrationTicket(request, validUser.email);
    const response = await request.post("/auth/register/complete", {
      form: {
        ticket,
        email: validUser.email,
        fullName: validUser.fullName,
        username: validUser.username,
        password: validUser.password,
        confirmPassword: validUser.password
      },
      failOnStatusCode: false,
      maxRedirects: 0
    });

    expectStatusExact(response, 302, "Registration bootstrap should redirect to login-success");
    expect(response.headers().location).toContain("/login-success");
  }

  test.describe("Auth - API Login and Authentication", () => {
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

  test.describe.serial("Auth - API Registration and Database Verification", () => {
    test("[API-TC-004] - API Authentication - Registration OTP - OTP Generation and Pending Verification Persistence", async ({
      request
    }) => {
      const response = await request.post("/auth/register/send-code", {
        form: { email: validUser.email },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration OTP send should redirect to verify");
      expect(response.headers().location).toContain("/register/verify");
      expect(response.headers().location).toContain("email=");

      const latest = await ApiOtpHelper.latest(validUser.email, "REGISTER");
      expect(latest).not.toBeNull();
      expect(latest?.status).toBe("PENDING");
    });

    test("[API-TC-005] - API Authentication - Registration OTP - Official Test Hook Verification @extended", async ({
      request
    }) => {
      const otp = await ApiOtpAccessHelper.latestOtp(request, validUser.email, "REGISTER");

      const response = await request.post("/auth/register/verify", {
        form: { email: validUser.email, otp },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration OTP verify should redirect to complete");
      expect(response.headers().location).toContain("/register/complete");
      expect(response.headers().location).toContain("ticket=");
      expect(response.headers().location).toContain("email=");

      const ticketMatch = response.headers().location.match(/ticket=([^&]+)/);
      expect(ticketMatch).not.toBeNull();
      registrationTicket = ticketMatch?.[1] ?? "";
      expect(registrationTicket).not.toBe("");
    });

    test("[API-TC-006] - API Authentication - Registration - Successful Registration and Customer Persistence", async ({
      request
    }) => {
      expect(registrationTicket).not.toBe("");

      const response = await request.post("/auth/register/complete", {
        form: {
          ticket: registrationTicket,
          email: validUser.email,
          fullName: validUser.fullName,
          username: validUser.username,
          password: validUser.password,
          confirmPassword: validUser.password
        },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Registration complete should redirect to login-success");
      expect(response.headers().location).toContain("/login-success");
      const cookies = response.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
      expect(cookies.length).toBeGreaterThan(0);

      const createdRows = await MySqlDbClient.query<{ username: string; email: string }>(
        "SELECT username, email FROM customer WHERE username = ? AND email = ?",
        [validUser.username, validUser.email]
      );
      expect(createdRows.length).toBe(1);
    });

    test("[API-TC-007] - API Authentication - Registration - Password Confirmation Mismatch Rejection", async ({
      request
    }) => {
      const isolatedUser = {
        username: `testuser_auth_mismatch_${Date.now()}`,
        password: "Password@123",
        email: `testauth_mismatch_${Date.now()}@example.com`,
        fullName: "Bot Testing"
      };
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

      const createdRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM customer WHERE email = ? OR username = ?",
        [isolatedUser.email, `${isolatedUser.username}_failed`]
      );
      expect(Number(createdRows[0]?.count ?? 0)).toBe(0);

      await MySqlDbClient.execute("DELETE FROM email_verification WHERE email = ?", [isolatedUser.email]);
    });
  });

  test.describe("Auth - API Forgot Password and Reset", () => {
    test("[API-TC-008] - API Authentication - Forgot Password - OTP Generation and Database Persistence", async ({
      request
    }) => {
      expect(validLocalEmail).toBeTruthy();
      const response = await request.post("/auth/forgot-password", {
        form: { email: validLocalEmail },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 302, "MVC forgot-password currently redirects");
      expect(response.headers().location).toContain("/auth/reset-password");

      const rows = await MySqlDbClient.query<{ id: number; email: string; purpose: string; status: string }>(
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
    });

    test("[API-TC-009] - API Authentication - Password Reset - Invalid OTP Rejection @extended", async ({ request }) => {
      expect(validLocalEmail).toBeTruthy();
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
    });

    test("[API-TC-011] - API Authentication - Password Reset - Successful Reset and Login Data Update", async ({
      request
    }) => {
      await ensureValidUserRegistered(request);
      const nextPassword = "Password@456";

      const forgotPasswordResponse = await request.post("/api/v1/auth/forgot-password", {
        params: { email: validUser.email },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(forgotPasswordResponse, 200, "API forgot-password should succeed");

      const otp = await ApiOtpAccessHelper.latestOtp(request, validUser.email, "RESET_PASSWORD");

      const response = await request.post("/auth/reset-password", {
        form: {
          email: validUser.email,
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
        form: { username: validUser.username, password: validUser.password },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(oldLogin, 302, "Old password login should redirect with error");
      expect(oldLogin.headers().location).toContain("errorMessage");

      const newLogin = await request.post("/login", {
        form: { username: validUser.username, password: nextPassword },
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(newLogin, 302, "New password login should redirect to success");
      expect(newLogin.headers().location).toContain("/login-success");

      validUser.password = nextPassword;
    });
  });

  test.describe("Auth - API Logout", () => {
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




