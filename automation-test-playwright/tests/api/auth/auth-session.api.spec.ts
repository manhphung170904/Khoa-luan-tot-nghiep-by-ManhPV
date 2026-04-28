import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectLooseApiText, expectObjectBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiOtpHelper } from "@api/apiOtpHelper";
import { env } from "@config/env";
import { ApiSessionHelper, type ApiUserRole } from "@api/apiSessionHelper";
import { TestDbRepository } from "@db/repositories";
import { TestDataFactory } from "@helpers/TestDataFactory";

type RoleScenario = {
  role: ApiUserRole;
  expectedRoleCode: "ADMIN" | "STAFF" | "CUSTOMER";
};

const scenarios: RoleScenario[] = [
  { role: "admin", expectedRoleCode: "ADMIN" },
  { role: "staff", expectedRoleCode: "STAFF" },
  { role: "customer", expectedRoleCode: "CUSTOMER" }
];

test.describe("Auth - API REST Session @regression @api", () => {
  for (const scenario of scenarios) {
    test(`[API-AUTH-REST-${scenario.expectedRoleCode}] - API Auth Session - Session Flow - Login Me and Logout with Session Cookie @smoke`, async ({
      anonymousApi
    }) => {
      const { response, username } = await ApiSessionHelper.loginAsRole(anonymousApi, scenario.role);
      const loginBody = await expectApiMessage<{
        message?: string;
        data?: { user?: { id?: number; username?: string; role?: string; userType?: string; signupSource?: string } };
      }>(response, { status: 200, message: apiExpectedMessages.auth.login, dataMode: "object" });
      expect(loginBody.data?.user?.username).toBe(username);
      expect(loginBody.data?.user?.role).toBe(scenario.expectedRoleCode);
      expect(loginBody.data?.user?.id).toBeTruthy();
      expect(loginBody.data?.user?.userType).toBeTruthy();
      expect(loginBody.data?.user?.signupSource).toBeTruthy();

      const meResponse = await anonymousApi.get("/api/v1/auth/me", {
        failOnStatusCode: false
      });
      const meBody = await expectObjectBody<{
        user?: { id?: number; username?: string; role?: string; userType?: string; signupSource?: string };
      }>(meResponse, 200, ["user"]);

      expect(meBody.user?.username).toBe(username);
      expect(meBody.user?.role).toBe(scenario.expectedRoleCode);
      expect(meBody.user?.id).toBe(loginBody.data?.user?.id);
      expect(meBody.user?.userType).toBe(loginBody.data?.user?.userType);
      expect(meBody.user?.signupSource).toBe(loginBody.data?.user?.signupSource);

      const logoutResponse = await ApiSessionHelper.logout(anonymousApi);
      await expectApiMessage(logoutResponse, { status: 200, message: apiExpectedMessages.auth.logout, dataMode: "null" });

      const afterLogoutMe = await anonymousApi.get("/api/v1/auth/me", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      await expectApiErrorBody(afterLogoutMe, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/auth/me"
      });
    });
  }

  test("[API-AUTH-REST-VAL-001] - API Auth Session - Login Payload - Empty DTO Validation", async ({ anonymousApi }) => {
    const response = await anonymousApi.post("/api/v1/auth/login", {
      failOnStatusCode: false,
      data: {
        username: "",
        password: ""
      }
    });

    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/auth/login",
      fields: ["username", "password"]
    });
  });

  test("[API-AUTH-REST-VAL-002] - API Auth Session - Login - Invalid Credential Rejection", async ({ anonymousApi }) => {
    const response = await anonymousApi.post("/api/v1/auth/login", {
      failOnStatusCode: false,
      data: {
        username: env.adminUsername,
        password: "wrong-password"
      }
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/auth/login"
    });
    expectLooseApiText(errorBody.message, /credential|username|password|ten dang nhap|mat khau|sai tai khoan hoac mat khau|dang nhap|khong dung/i);
  });

  test("[API-AUTH-REST-SEC-001] - API Auth Session - Me Endpoint - Anonymous Access Rejection @smoke", async ({ anonymousApi }) => {
    const response = await anonymousApi.get("/api/v1/auth/me", {
      failOnStatusCode: false,
      maxRedirects: 0
    });

    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/auth/me"
    });
  });

  test("[API-AUTH-REST-OTP-001] - API Auth Session - Forgot Password - Existing Email OTP Persistence", async ({
    anonymousApi
  }) => {
    const customers = await TestDbRepository.query<{ email: string }>(
      "SELECT email FROM customer WHERE username = ? LIMIT 1",
      [env.customerUsername]
    );
    const email = customers[0]?.email ?? "";
    expect(email).toBeTruthy();
    const baselineVerificationId = await ApiOtpHelper.latestVerificationId(email, "RESET_PASSWORD");

    try {
      const response = await anonymousApi.post("/api/v1/auth/forgot-password", {
        failOnStatusCode: false,
        params: { email }
      });

      await expectApiMessage(response, {
        status: 200,
        message: apiExpectedMessages.auth.forgotPassword,
        dataMode: "null"
      });

      const otpRows = await TestDbRepository.query<{ status: string }>(
        `
          SELECT status
          FROM email_verification
          WHERE email = ? AND purpose = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [email, "RESET_PASSWORD"]
      );
      expect(otpRows.length).toBeGreaterThan(0);
      expect(otpRows[0]!.status).toBe("PENDING");

      const afterRows = await TestDbRepository.query<{ total: number }>(
        "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
        [email, "RESET_PASSWORD"]
      );
      expect(afterRows[0]!.total).toBeGreaterThan(0);
    } finally {
      await ApiOtpHelper.deleteVerificationsAfter(email, "RESET_PASSWORD", baselineVerificationId);
    }
  });

  test("[API-AUTH-REST-OTP-002] - API Auth Session - Forgot Password - Nonexistent Email Success Contract Preservation", async ({
    anonymousApi
  }) => {
    const email = TestDataFactory.taoEmail("pw-missing");

    const beforeRows = await TestDbRepository.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
      [email, "RESET_PASSWORD"]
    );

    const response = await anonymousApi.post("/api/v1/auth/forgot-password", {
      failOnStatusCode: false,
      params: { email }
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.auth.forgotPassword,
      dataMode: "null"
    });

    const afterRows = await TestDbRepository.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
      [email, "RESET_PASSWORD"]
    );
    expect(afterRows[0]!.total).toBe(beforeRows[0]!.total);
  });
});
