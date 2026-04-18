import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectObjectBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { env } from "@config/env";
import { ApiSessionHelper, type ApiUserRole } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";

type RoleScenario = {
  role: ApiUserRole;
  expectedRoleCode: "ADMIN" | "STAFF" | "CUSTOMER";
};

const scenarios: RoleScenario[] = [
  { role: "admin", expectedRoleCode: "ADMIN" },
  { role: "staff", expectedRoleCode: "STAFF" },
  { role: "customer", expectedRoleCode: "CUSTOMER" }
];

test.describe("REST Auth Session API @regression", () => {
  for (const scenario of scenarios) {
    test(`API-AUTH-REST-${scenario.expectedRoleCode} login/me/logout works with cookie session @smoke`, async ({
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

  test("API-AUTH-REST-VAL-001 rejects blank login DTO", async ({ anonymousApi }) => {
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

  test("API-AUTH-REST-VAL-002 rejects wrong credential on REST login", async ({ anonymousApi }) => {
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
    expect(errorBody.message).toMatch(
      /credential|username|password|tên đăng nhập|mật khẩu|sai tài khoản hoặc mật khẩu|dang nhap|mat khau|khong dung/i
    );
  });

  test("API-AUTH-REST-SEC-001 rejects anonymous me access @smoke", async ({ anonymousApi }) => {
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

  test("API-AUTH-REST-OTP-001 forgot-password returns success and persists pending OTP for existing email", async ({
    anonymousApi
  }) => {
    const customers = await MySqlDbClient.query<{ email: string }>(
      "SELECT email FROM customer WHERE username = ? LIMIT 1",
      [env.customerUsername]
    );
    const email = customers[0]?.email ?? "";
    expect(email).toBeTruthy();

    const response = await anonymousApi.post("/api/v1/auth/forgot-password", {
      failOnStatusCode: false,
      params: { email }
    });

    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.auth.forgotPassword,
      dataMode: "null"
    });

    const otpRows = await MySqlDbClient.query<{ status: string }>(
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

    const afterRows = await MySqlDbClient.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
      [email, "RESET_PASSWORD"]
    );
    expect(afterRows[0]!.total).toBeGreaterThan(0);
  });

  test("API-AUTH-REST-OTP-002 forgot-password keeps success contract for unknown email", async ({
    anonymousApi
  }) => {
    const email = `pw-missing-${Date.now()}@example.com`;

    const beforeRows = await MySqlDbClient.query<{ total: number }>(
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

    const afterRows = await MySqlDbClient.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
      [email, "RESET_PASSWORD"]
    );
    expect(afterRows[0]!.total).toBe(beforeRows[0]!.total);
  });
});



