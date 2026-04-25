import { expect, type APIResponse } from "@playwright/test";

export type ApiCoverageStatus = "covered" | "partial" | "missing" | "defect-driven";
export type EndpointKind = "readonly" | "mutation" | "upload" | "otp-auth" | "background-trigger";

export type ExpectedApiContract = {
  success?: number[];
  anonymous?: number[];
  invalidSession?: number[];
  wrongRole?: number[];
  validation?: number[];
  businessRule?: number[];
};

export type ApiMessageDataMode = "null" | "object" | "absent-ok";

export type ExpectedApiErrorBody = {
  status: number;
  code: string;
  path?: string;
  message?: string;
  fields?: string[];
};

export type ExpectedApiMessageBody = {
  status: number;
  message: string;
  dataMode?: ApiMessageDataMode;
};

export type ExpectedPageBody = {
  status: number;
  requiredPageKeys?: boolean;
};

export function expectStatusExact(response: APIResponse, expected: number, context: string): void {
  expect(
    response.status(),
    `${context}: expected HTTP ${expected}, got ${response.status()} for ${response.url()}`
  ).toBe(expected);
}

export async function expectJsonArray(response: APIResponse): Promise<unknown[]> {
  const payload = (await response.json()) as unknown;
  expect(Array.isArray(payload), "Expected JSON array response").toBeTruthy();
  return payload as unknown[];
}

export async function expectJsonObject<T extends object>(response: APIResponse): Promise<T> {
  const payload = (await response.json()) as unknown;
  expect(typeof payload).toBe("object");
  expect(payload).not.toBeNull();
  return payload as T;
}

export async function expectApiErrorBody<T extends { code?: string; status?: number; message?: string; path?: string; timestamp?: string; errors?: Array<{ field?: string; message?: string }> }>(
  response: APIResponse,
  expected: ExpectedApiErrorBody
): Promise<T> {
  expectStatusExact(response, expected.status, "Unexpected API error response status");
  const payload = await expectJsonObject<T>(response);

  expect(payload.code).toBe(expected.code);
  expect(payload.status).toBe(expected.status);
  expect(typeof payload.message).toBe("string");
  expect(payload.message).toBeTruthy();

  if (expected.message !== undefined) {
    expect(payload.message).toBe(expected.message);
  }

  if (expected.path !== undefined) {
    expect(payload.path).toBe(expected.path);
  } else {
    expect(typeof payload.path).toBe("string");
    expect(payload.path).toBeTruthy();
  }

  expect(typeof payload.timestamp).toBe("string");
  expect(Number.isNaN(Date.parse(payload.timestamp ?? ""))).toBeFalsy();

  if (expected.fields) {
    const errorFields = payload.errors?.map((item) => item.field) ?? [];
    expect(errorFields).toEqual(expect.arrayContaining(expected.fields));
  }

  return payload;
}

export async function expectApiMessage<T extends { message?: string; data?: unknown }>(
  response: APIResponse,
  expected: ExpectedApiMessageBody
): Promise<T> {
  expectStatusExact(response, expected.status, "Unexpected API message response status");
  const payload = await expectJsonObject<T>(response);

  expect(payload.message).toBe(expected.message);

  switch (expected.dataMode ?? "absent-ok") {
    case "null":
      expect("data" in payload).toBeTruthy();
      expect(payload.data).toBeNull();
      break;
    case "object":
      expect(typeof payload.data).toBe("object");
      expect(payload.data).not.toBeNull();
      break;
    case "absent-ok":
      break;
  }

  return payload;
}

export async function expectPageBody<T extends { content?: unknown[]; page?: number; size?: number; totalElements?: number; totalPages?: number }>(
  response: APIResponse,
  expected: ExpectedPageBody
): Promise<T> {
  expectStatusExact(response, expected.status, "Unexpected page response status");
  const payload = await expectJsonObject<T>(response);

  expect(Array.isArray(payload.content)).toBeTruthy();

  if (expected.requiredPageKeys ?? true) {
    expect(typeof payload.page).toBe("number");
    expect(typeof payload.size).toBe("number");
    expect(typeof payload.totalElements).toBe("number");
    expect(typeof payload.totalPages).toBe("number");
  }

  return payload;
}

export async function expectArrayBody<T = unknown>(response: APIResponse, status = 200): Promise<T[]> {
  expectStatusExact(response, status, "Unexpected array response status");
  return (await expectJsonArray(response)) as T[];
}

export async function expectObjectBody<T extends object>(
  response: APIResponse,
  status = 200,
  requiredKeys: string[] = []
): Promise<T> {
  expectStatusExact(response, status, "Unexpected object response status");
  const payload = await expectJsonObject<T>(response);

  for (const key of requiredKeys) {
    expect(key in payload).toBeTruthy();
  }

  return payload;
}
