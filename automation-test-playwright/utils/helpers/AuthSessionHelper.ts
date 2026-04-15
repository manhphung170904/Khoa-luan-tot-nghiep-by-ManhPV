import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { env } from "@config/env";
import { LoginPage } from "@pages/auth/LoginPage";
import { MySqlDbClient } from "@db/MySqlDbClient";

export type UserRole = "admin" | "staff" | "customer";

export class AuthSessionHelper {
  private static readonly resolvedUsernames = new Map<UserRole, string>();

  private static usernameFor(role: UserRole): string {
    const resolved = this.resolvedUsernames.get(role);
    if (resolved) {
      return resolved;
    }

    switch (role) {
      case "admin":
        return env.adminUsernames[0] ?? env.adminUsername;
      case "staff":
        return env.staffUsernames[0] ?? env.staffUsername;
      case "customer":
        return env.customerUsernames[0] ?? env.customerUsername;
    }
  }

  private static usernameCandidatesFor(role: UserRole): string[] {
    const preferred = this.resolvedUsernames.get(role);
    const configured =
      role === "admin"
        ? env.adminUsernames
        : role === "staff"
          ? env.staffUsernames
          : env.customerUsernames;

    const unique = new Set<string>();
    if (preferred) {
      unique.add(preferred);
    }

    configured.forEach((username) => unique.add(username));
    return [...unique];
  }

  private static successUrlPattern(role: UserRole): RegExp {
    switch (role) {
      case "admin":
        return /\/admin\/|\/login-success/;
      case "staff":
        return /\/staff\/|\/login-success/;
      case "customer":
        return /\/customer\/|\/login-success/;
    }
  }

  private static matchesRoleLandingUrl(role: UserRole, rawUrl: string): boolean {
    return this.successUrlPattern(role).test(rawUrl);
  }

  private static async usernameMatchesRole(role: UserRole, username: string): Promise<boolean> {
    if (role === "customer") {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM customer WHERE username = ? LIMIT 1", [username]);
      return rows.length > 0;
    }

    const staffRole = role === "admin" ? "ADMIN" : "STAFF";
    const rows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM staff WHERE username = ? AND role = ? LIMIT 1",
      [username, staffRole]
    );
    return rows.length > 0;
  }

  private static isSuccessfulUiLogin(page: Page, role: UserRole): boolean {
    const url = page.url();
    return this.matchesRoleLandingUrl(role, url) && !/\/login(?:\?|$)/.test(url);
  }

  private static async waitForStableRoleLanding(page: Page, role: UserRole): Promise<void> {
    const currentUrl = page.url();
    if (!/\/login-success/.test(currentUrl)) {
      return;
    }

    try {
      await page.waitForURL(
        (url) => this.matchesRoleLandingUrl(role, url.toString()) && !/\/login-success/.test(url.toString()),
        { timeout: 5_000 }
      );
    } catch {
      // Co mot so luong dung lai o login-success trong thoi gian ngan.
    }

    await page.waitForLoadState("domcontentloaded");
  }

  private static async tryLoginUi(page: Page, role: UserRole, username: string, password: string): Promise<boolean> {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);

    try {
      await Promise.race([
        page.waitForURL(
          (url) => this.matchesRoleLandingUrl(role, url.toString()) && !/\/login(?:\?|$)/.test(url.toString()),
          { timeout: 5_000 }
        ),
        page.waitForURL((url) => /\/login(?:\?|$)/.test(url.toString()), { timeout: 5_000 })
      ]);
    } catch {
      // Neu redirect cham hon du kien, ta van kiem tra URL hien tai o buoc sau.
    }

    await page.waitForLoadState("domcontentloaded");
    return this.isSuccessfulUiLogin(page, role);
  }

  private static isSuccessfulApiLogin(response: Awaited<ReturnType<APIRequestContext["post"]>>, role: UserRole): boolean {
    const location = response.headers()["location"] ?? "";

    if (response.status() === 302) {
      if (location.includes("/login?errorMessage")) {
        return false;
      }

      return this.matchesRoleLandingUrl(role, location);
    }

    return this.matchesRoleLandingUrl(role, response.url()) && !/\/login(?:\?|$)/.test(response.url());
  }

  static async loginUi(page: Page, username: string, password = env.defaultPassword): Promise<void> {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);
  }

  static async logoutUi(page: Page): Promise<void> {
    try {
      await page.goto("/logout", { waitUntil: "commit" });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) {
        throw error;
      }
    }

    try {
      await page.waitForURL((url) => /\/login(?:\?|$)/.test(url.toString()) || /\/$/.test(url.toString()), { timeout: 5_000 });
    } catch {
      // Neu he thong redirect khac, ta van xoa cookie va dua ve trang login de dong bo session.
    }

    await page.context().clearCookies();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
  }

  static async loginAsAdminUi(page: Page): Promise<void> {
    await this.loginAsRoleUi(page, "admin");
  }

  static async loginAsStaffUi(page: Page): Promise<void> {
    await this.loginAsRoleUi(page, "staff");
  }

  static async loginAsCustomerUi(page: Page): Promise<void> {
    await this.loginAsRoleUi(page, "customer");
  }

  static async resolveWorkingUsername(page: Page, role: UserRole, password = env.defaultPassword): Promise<string> {
    const candidates = this.usernameCandidatesFor(role);

    for (const username of candidates) {
      if (!(await this.usernameMatchesRole(role, username))) {
        continue;
      }

      if (await this.tryLoginUi(page, role, username, password)) {
        this.resolvedUsernames.set(role, username);
        return username;
      }
    }

    throw new Error(
      `Khong tim thay tai khoan ${role} hop le. Da thu: ${candidates.join(", ")}. Hay cap nhat bien moi truong ${
        role.toUpperCase()
      }_USERNAME hoac ${role.toUpperCase()}_USERNAMES.`
    );
  }

  static async loginAsRoleUi(page: Page, role: UserRole): Promise<void> {
    const resolved = await this.resolveWorkingUsername(page, role);
    this.resolvedUsernames.set(role, resolved);
    await this.waitForStableRoleLanding(page, role);
  }

  static async loginApi(request: APIRequestContext, username: string, password = env.defaultPassword) {
    return request.post("/login", {
      form: {
        username,
        password
      },
      maxRedirects: 0,
      failOnStatusCode: false
    });
  }

  static async loginAsRoleApi(request: APIRequestContext, role: UserRole) {
    const candidates = this.usernameCandidatesFor(role);

    for (const username of candidates) {
      if (!(await this.usernameMatchesRole(role, username))) {
        continue;
      }

      const response = await this.loginApi(request, username);
      if (this.isSuccessfulApiLogin(response, role)) {
        this.resolvedUsernames.set(role, username);
        return response;
      }
    }

    throw new Error(
      `Khong dang nhap API duoc voi role ${role}. Da thu: ${candidates.join(", ")}. Hay cap nhat bien moi truong phu hop.`
    );
  }

  static async loginAsAdminApi(request: APIRequestContext) {
    return this.loginAsRoleApi(request, "admin");
  }

  static async loginAsStaffApi(request: APIRequestContext) {
    return this.loginAsRoleApi(request, "staff");
  }

  static async loginAsCustomerApi(request: APIRequestContext) {
    return this.loginAsRoleApi(request, "customer");
  }

  static async expectLoggedIn(page: Page, expectedPath: RegExp): Promise<void> {
    await expect(page).toHaveURL(expectedPath);
  }
}
