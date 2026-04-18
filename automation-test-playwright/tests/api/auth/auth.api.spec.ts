import { expect, test, type APIRequestContext } from "@playwright/test";
import { env } from "@config/env";
import { ApiOtpAccessHelper } from "@api/apiOtpAccessHelper";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { expectStatusExact } from "@api/apiContractUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";

test.describe.serial("Authentication Web Flow Contract Tests @api @api-write @otp @regression", () => {
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
    await MySqlDbClient.close();
  });

  test.describe("1. Login + Authentication", () => {
    test("[API_TC_001] [Happy Path] Login with valid credentials returns JWT cookies and redirect @smoke @regression", async ({
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

    test("[API_TC_002] [Negative] Blank username/password returns login error redirect @regression", async ({
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

    test("[API_TC_003] [Negative] Wrong credentials are rejected @regression", async ({ request }) => {
      const response = await request.post("/login", {
        form: { username: env.adminUsername, password: "bad-password-123" },
        failOnStatusCode: false,
        maxRedirects: 0
      });

      expectStatusExact(response, 302, "Wrong-credential login should redirect with error");
      expect(response.headers().location).toContain("errorMessage");
    });
  });

  test.describe("2. Registration + Database Chaining", () => {
    test("[API_TC_004] [Happy Path] Send registration OTP and persist pending verification row @regression", async ({
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

    test("[API_TC_005] [Happy Path] Verify registration OTP via official test hook @extended", async ({
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

    test("[API_TC_006] [Happy Path] Complete registration and verify customer row created @regression", async ({
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

    test("[API_TC_007] [Negative] Complete registration fails when passwords do not match @regression", async ({
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

  test.describe("3. Forgot Password + Reset Password", () => {
    test("[API_TC_008] [Happy Path] Request forgot password and check OTP row in DB @regression", async ({
      request
    }) => {
      test.fail(true, "Known defect: MVC POST /auth/forgot-password is not permitAll in security config, so anonymous requests are redirected to /login.");

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

    test("[API_TC_009] [Negative] Reset password with incorrect OTP is rejected @extended", async ({ request }) => {
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

    test("[API_TC_011] [Happy Path] Reset password with valid OTP redirects to login and updates credentials @regression", async ({
      request
    }) => {
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

  test.describe("4. Logout", () => {
    test("[API_TC_010] [Security] Logout clears auth cookies and redirects to login @smoke @regression", async ({
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
