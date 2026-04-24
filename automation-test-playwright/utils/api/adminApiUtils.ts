import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { env } from "@config/env";
import { ApiSessionHelper, type ApiUserRole } from "@api/apiSessionHelper";
import type { ExpectedApiContract, EndpointKind, ApiCoverageStatus } from "@api/apiContractUtils";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type RequestContextFactory = {
  request: {
    newContext: (options?: Record<string, unknown>) => Promise<APIRequestContext>;
  };
};

export type RequestDescriptor = {
  id: string;
  method: HttpMethod;
  path: string;
  roleExpected?: ApiUserRole | "public";
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

export const tinyPngFile = (name = "tiny.png") => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnM6f8AAAAASUVORK5CYII=",
    "base64"
  )
});

export const invalidTextFile = (name = "invalid.txt") => ({
  name,
  mimeType: "text/plain",
  buffer: Buffer.from("not-an-image", "utf8")
});

export async function createRoleContext(
  playwright: RequestContextFactory,
  role: ApiUserRole,
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
    const response = await ApiSessionHelper.login(context, usernameOverride, password);
    expect(response.status()).toBe(200);
    return context;
  }

  await ApiSessionHelper.loginAsRole(context, role);

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
    // Keep redirects visible so security tests can assert unauthenticated flows precisely.
    maxRedirects: 0,
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
