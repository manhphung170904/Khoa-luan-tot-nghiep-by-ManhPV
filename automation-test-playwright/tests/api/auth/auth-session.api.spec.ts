import { test, expect } from "@playwright/test";
import { env } from "@config/env";
import { expectMessageBody, expectStatusExact } from "@api/apiContractUtils";

type RoleScenario = {
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  username: string;
};

const roleScenarios: RoleScenario[] = [
  { role: "ADMIN", username: env.adminUsername },
  { role: "STAFF", username: env.staffUsername },
  { role: "CUSTOMER", username: env.customerUsername }
];

test.describe("REST Auth Session API @api @regression", () => {
  for (const scenario of roleScenarios) {
    test(`API-AUTH-REST-${scenario.role} login/me/logout works for ${scenario.role} @smoke @regression`, async ({ playwright }) => {
      const context = await playwright.request.newContext({
        baseURL: env.baseUrl,
        extraHTTPHeaders: {
          Accept: "application/json"
        }
      });

      try {
        const loginResponse = await context.post("/api/v1/auth/login", {
          failOnStatusCode: false,
          data: {
            username: scenario.username,
            password: env.defaultPassword
          }
        });
        expectStatusExact(loginResponse, 200, `REST auth login should succeed for ${scenario.role}`);

        const cookieHeader = loginResponse
          .headersArray()
          .filter((header) => header.name.toLowerCase() === "set-cookie")
          .map((header) => header.value)
          .join("; ");
        expect(cookieHeader).toContain("estate_access_token=");
        expect(cookieHeader).toContain("estate_refresh_token=");

        const loginBody = (await loginResponse.json()) as {
          message?: string;
          data?: { user?: { username?: string; role?: string } };
        };
        expect(loginBody.message).toBe("Login successful.");
        expect(loginBody.data?.user?.username).toBe(scenario.username);
        expect(loginBody.data?.user?.role).toBe(scenario.role);

        const meResponse = await context.get("/api/v1/auth/me", {
          failOnStatusCode: false,
          maxRedirects: 0
        });
        expectStatusExact(meResponse, 200, `REST auth me should succeed for ${scenario.role}`);

        const meBody = (await meResponse.json()) as { user?: { username?: string; role?: string } };
        expect(meBody.user?.username).toBe(scenario.username);
        expect(meBody.user?.role).toBe(scenario.role);

        const logoutResponse = await context.post("/api/v1/auth/logout", {
          failOnStatusCode: false,
          maxRedirects: 0
        });
        const message = await expectMessageBody(logoutResponse, 200);
        expect(message).toBe("Logout successful.");

        const afterLogoutMe = await context.get("/api/v1/auth/me", {
          failOnStatusCode: false,
          maxRedirects: 0
        });
        expectStatusExact(afterLogoutMe, 401, `REST auth me should reject cleared session for ${scenario.role}`);
      } finally {
        await context.dispose();
      }
    });
  }

  test("API-AUTH-REST-VAL-001 rejects blank login DTO @regression", async ({ playwright }) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });

    try {
      const response = await context.post("/api/v1/auth/login", {
        failOnStatusCode: false,
        data: {
          username: "",
          password: ""
        }
      });

      const message = await expectMessageBody(response, 400);
      expect(message.length).toBeGreaterThan(0);
    } finally {
      await context.dispose();
    }
  });

  test("API-AUTH-REST-VAL-002 rejects wrong credential on REST login @regression", async ({ playwright }) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });

    try {
      const response = await context.post("/api/v1/auth/login", {
        failOnStatusCode: false,
        data: {
          username: env.adminUsername,
          password: "wrong-password"
        }
      });

      const message = await expectMessageBody(response, 400);
      expect(message).toContain("Invalid");
    } finally {
      await context.dispose();
    }
  });

  test("API-AUTH-REST-SEC-001 rejects anonymous me access @smoke @regression", async ({ playwright }) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });

    try {
      const response = await context.get("/api/v1/auth/me", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 401, "REST auth me must reject anonymous access");
    } finally {
      await context.dispose();
    }
  });
});
