import type { APIRequestContext, APIResponse } from "@playwright/test";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";

export type ApiUserRole = "admin" | "staff" | "customer";

type RequestContextFactory = {
  request: {
    newContext: (options?: Record<string, unknown>) => Promise<APIRequestContext>;
  };
};

export class ApiSessionHelper {
  private static readonly resolvedUsernames = new Map<ApiUserRole, string>();

  private static configuredUsernames(role: ApiUserRole): string[] {
    switch (role) {
      case "admin":
        return env.adminUsernames;
      case "staff":
        return env.staffUsernames;
      case "customer":
        return env.customerUsernames;
    }
  }

  private static fallbackUsername(role: ApiUserRole): string {
    switch (role) {
      case "admin":
        return env.adminUsername;
      case "staff":
        return env.staffUsername;
      case "customer":
        return env.customerUsername;
    }
  }

  static usernameCandidates(role: ApiUserRole): string[] {
    const unique = new Set<string>();
    const resolved = this.resolvedUsernames.get(role);
    if (resolved) {
      unique.add(resolved);
    }

    this.configuredUsernames(role).forEach((username) => unique.add(username));
    unique.add(this.fallbackUsername(role));
    return [...unique].filter(Boolean);
  }

  static async usernameMatchesRole(role: ApiUserRole, username: string): Promise<boolean> {
    if (role === "customer") {
      const rows = await MySqlDbClient.query<{ id: number }>(
        "SELECT id FROM customer WHERE username = ? LIMIT 1",
        [username]
      );
      return rows.length > 0;
    }

    const expectedRole = role === "admin" ? "ADMIN" : "STAFF";
    const rows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM staff WHERE username = ? AND role = ? LIMIT 1",
      [username, expectedRole]
    );
    return rows.length > 0;
  }

  static async login(
    request: APIRequestContext,
    username: string,
    password = env.defaultPassword
  ): Promise<APIResponse> {
    return request.post("/api/v1/auth/login", {
      failOnStatusCode: false,
      data: {
        username,
        password
      }
    });
  }

  static async loginAsRole(
    request: APIRequestContext,
    role: ApiUserRole,
    password = env.defaultPassword
  ): Promise<{ response: APIResponse; username: string }> {
    const candidates = this.usernameCandidates(role);

    for (const username of candidates) {
      if (!(await this.usernameMatchesRole(role, username))) {
        continue;
      }

      const response = await this.login(request, username, password);
      if (response.status() === 200) {
        this.resolvedUsernames.set(role, username);
        return { response, username };
      }
    }

    throw new Error(
      `Khong dang nhap API duoc voi role ${role}. Da thu: ${candidates.join(", ")}.`
    );
  }

  static async newContext(
    playwright: RequestContextFactory,
    role?: ApiUserRole
  ): Promise<APIRequestContext> {
    const context = await playwright.request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });

    if (role) {
      await this.loginAsRole(context, role);
    }

    return context;
  }

  static async logout(context: APIRequestContext): Promise<APIResponse> {
    return context.post("/api/v1/auth/logout", {
      failOnStatusCode: false
    });
  }
}
