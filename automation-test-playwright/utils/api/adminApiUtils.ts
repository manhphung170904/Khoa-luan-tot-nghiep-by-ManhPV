import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { env } from "@config/env";
import { AuthSessionHelper, type UserRole } from "@helpers/AuthSessionHelper";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import type { ExpectedApiContract, EndpointKind, ApiCoverageStatus } from "@api/apiContractUtils";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type RequestContextFactory = {
  request: {
    newContext: (options?: Record<string, unknown>) => Promise<APIRequestContext>;
  };
};

export type RequestDescriptor = {
  id: string;
  method: HttpMethod;
  path: string;
  roleExpected?: UserRole | "public";
  kind?: EndpointKind;
  coverage?: ApiCoverageStatus;
  contract?: ExpectedApiContract;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  multipart?: Record<
    string,
    string | number | boolean | { name: string; mimeType: string; buffer: Buffer }
  >;
};

export const moonNestRoot = path.resolve(process.cwd(), "..", "moonNest-main");
export const buildingImageDir = path.join(moonNestRoot, "src", "main", "resources", "static", "images", "building_img");
export const planningMapImageDir = path.join(moonNestRoot, "src", "main", "resources", "static", "images", "planning_map_img");

export const uniqueSuffix = (prefix: string): string => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
export const randomPhone = (): string => `0${String(Date.now()).slice(-9)}`;
export const randomEmail = (prefix: string): string => `${prefix}.${Date.now()}@example.com`;

export const tinyPngFile = (name = "tiny.png") => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnM6f8AAAAASUVORK5CYII=",
    "base64"
  )
});

export const oversizedPngFile = (name = "oversized.png") => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.alloc(5 * 1024 * 1024 + 16, 1)
});

export const invalidTextFile = (name = "invalid.txt") => ({
  name,
  mimeType: "text/plain",
  buffer: Buffer.from("not-an-image", "utf8")
});

export async function createRoleContext(
  playwright: RequestContextFactory,
  role: UserRole,
  usernameOverride?: string,
  password = env.defaultPassword
): Promise<APIRequestContext> {
  const context = await playwright.request.newContext({
    baseURL: env.baseUrl,
    extraHTTPHeaders: {
      Accept: "application/json"
    }
  });

  if (usernameOverride) {
    const response = await AuthSessionHelper.loginApi(context, usernameOverride, password);
    expect(response.status()).toBe(302);
    expect(response.headers()["location"] ?? "").not.toContain("errorMessage");
    return context;
  }

  if (role === "admin") {
    await AuthSessionHelper.loginAsAdminApi(context);
  } else if (role === "staff") {
    await AuthSessionHelper.loginAsStaffApi(context);
  } else {
    await AuthSessionHelper.loginAsCustomerApi(context);
  }

  return context;
}

export async function createAnonymousContext(
  playwright: RequestContextFactory,
  invalidCookie = false
): Promise<APIRequestContext> {
  const cookieHeader = invalidCookie ? { Cookie: "JSESSIONID=invalid-session-cookie" } : {};

  return playwright.request.newContext({
    baseURL: env.baseUrl,
    extraHTTPHeaders: {
      Accept: "application/json",
      ...cookieHeader
    }
  });
}

export async function sendRequest(context: APIRequestContext, request: RequestDescriptor): Promise<APIResponse> {
  const options = {
    failOnStatusCode: false,
    maxRedirects: 0,       // ← Bắt 302 redirect thay vì follow sang /login (200 HTML)
    params: request.params,
    data: request.data,
    multipart: request.multipart
  };

  switch (request.method) {
    case "GET":
      return context.get(request.path, options);
    case "POST":
      return context.post(request.path, options);
    case "PUT":
      return context.put(request.path, options);
    case "DELETE":
      return context.delete(request.path, options);
  }
}

export async function readJson<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

export async function readJsonIfPresent<T>(response: APIResponse): Promise<T | null> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

export async function expectMessage(response: APIResponse, status: number): Promise<string> {
  expect(response.status()).toBe(status);
  const body = await readJson<{ message?: string }>(response);
  expect(typeof body.message).toBe("string");
  return body.message ?? "";
}

export function expectAuthFailure(response: APIResponse): void {
  expect([302, 401, 403]).toContain(response.status());
}

export function expectApiAuthContract(response: APIResponse): void {
  expect([401, 403]).toContain(response.status());
}

export function expectBusinessFailure(response: APIResponse): void {
  expect([400, 409, 500]).toContain(response.status());
}

export function expectPageShape<T extends object>(payload: { content?: T[]; totalElements?: number }): asserts payload is {
  content: T[];
  totalElements: number;
} {
  expect(Array.isArray(payload.content)).toBeTruthy();
  expect(typeof payload.totalElements).toBe("number");
}

export async function forceOtp(email: string, purpose: string, otp: string): Promise<void> {
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  await MySqlDbClient.execute(
    `
      UPDATE email_verification
      SET otp_hash = ?, status = 'PENDING', expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE), verified_at = NULL, used_at = NULL
      WHERE email = ? AND purpose = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [hash, email.toLowerCase(), purpose]
  );
}

export async function latestPendingOtpEmail(email: string, purpose: string): Promise<{ id: number; status: string } | null> {
  const rows = await MySqlDbClient.query<{ id: number; status: string }>(
    `
      SELECT id, status
      FROM email_verification
      WHERE email = ? AND purpose = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [email.toLowerCase(), purpose]
  );

  return rows[0] ?? null;
}

export async function resolveStaffIdByUsername(username: string): Promise<number> {
  const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM staff WHERE username = ? LIMIT 1", [username]);
  expect(rows.length).toBeGreaterThan(0);
  return rows[0]!.id;
}

export async function resolveBuildingIdByName(name: string): Promise<number> {
  const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM building WHERE name = ? ORDER BY id DESC LIMIT 1", [name]);
  expect(rows.length).toBeGreaterThan(0);
  return rows[0]!.id;
}

export async function ensureFileExists(filePath: string): Promise<void> {
  expect(fs.existsSync(filePath), `Expected file to exist: ${filePath}`).toBeTruthy();
}

export async function createTempAdmin(playwright: RequestContextFactory): Promise<{
  context: APIRequestContext;
  staffId: number;
  username: string;
  email: string;
  cleanup: () => Promise<void>;
}> {
  const bootstrapAdmin = await createRoleContext(playwright, "admin");
  const unique = uniqueSuffix("admin");
  const username = `adm${Date.now().toString().slice(-7)}`;
  const email = randomEmail(unique);
  const phone = randomPhone();

  const createResponse = await bootstrapAdmin.post("/admin/staff/add", {
    failOnStatusCode: false,
    data: {
      username,
      password: env.defaultPassword,
      fullName: `Playwright ${unique}`,
      phone,
      email,
      role: "ADMIN"
    }
  });
  expect(createResponse.ok()).toBeTruthy();

  const staffId = await resolveStaffIdByUsername(username);
  await bootstrapAdmin.dispose();

  const context = await createRoleContext(playwright, "admin", username);

  return {
    context,
    staffId,
    username,
    email,
    cleanup: async () => {
      await context.dispose();
      const admin = await createRoleContext(playwright, "admin");
      try {
        await admin.delete(`/admin/staff/delete/${staffId}`, { failOnStatusCode: false });
      } finally {
        await admin.dispose();
      }
    }
  };
}

export { TempEntityHelper };
