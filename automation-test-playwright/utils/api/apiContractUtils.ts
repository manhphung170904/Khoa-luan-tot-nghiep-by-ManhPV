import { expect, type APIResponse, type TestInfo } from "@playwright/test";
import { TextNormalizeHelper } from "@helpers/TextNormalizeHelper";

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

export function expectLooseApiText(value: string | undefined, expected: RegExp | string): void {
  const normalizedValue = TextNormalizeHelper.normalizeLooseText(value ?? "");
  if (typeof expected === "string") {
    expect(normalizedValue).toContain(TextNormalizeHelper.normalizeLooseText(expected));
    return;
  }

  expect(normalizedValue).toMatch(expected);
}

export function expectStatusExact(response: APIResponse, expected: number, context: string): void {
  const contentType = response.headers()["content-type"] ?? "unknown content-type";
  expect(
    response.status(),
    `${context}: expected HTTP ${expected}, got ${response.status()} for ${response.url()} (${contentType})`
  ).toBe(expected);
}

export type ApiDebugAttachmentOptions = {
  name?: string;
  maxBodyLength?: number;
  request?: ApiDebugRequest;
};

export type ApiDebugRequest = {
  actor?: string;
  method?: string;
  path?: string;
  options?: unknown;
};

export async function responseTextPreview(response: APIResponse, maxLength = 1000): Promise<string> {
  const body = await response.text().catch(() => "");
  return body.length > maxLength ? `${body.slice(0, maxLength)}...` : body;
}

export async function buildApiResponseDebugAttachment(
  response: APIResponse,
  options: ApiDebugAttachmentOptions = {}
): Promise<{ name: string; body: string; contentType: string }> {
  const contentType = response.headers()["content-type"] ?? "text/plain";
  const safeUrl = response.url().replace(/[?#].*$/, "");
  const name = options.name ?? `api-${response.status()}-${safeUrl.split("/").filter(Boolean).pop() ?? "response"}`;
  const bodyPreview = await responseTextPreview(response, options.maxBodyLength ?? 5000);

  return {
    name,
    contentType: "application/json",
    body: JSON.stringify(
      {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        request: options.request,
        headers: response.headers(),
        contentType,
        bodyPreview
      },
      null,
      2
    )
  };
}

export async function attachApiResponse(
  testInfo: TestInfo,
  response: APIResponse,
  options: ApiDebugAttachmentOptions = {}
): Promise<void> {
  const attachment = await buildApiResponseDebugAttachment(response, options);
  await testInfo.attach(attachment.name, {
    body: attachment.body,
    contentType: attachment.contentType
  });
}

export async function expectJsonArray(response: APIResponse): Promise<unknown[]> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      `Expected JSON array response from ${response.url()}, got ${response.status()}. Body preview: ${await responseTextPreview(response)}`,
      { cause: error }
    );
  }

  expect(Array.isArray(payload), "Expected JSON array response").toBeTruthy();
  return payload as unknown[];
}

export async function expectJsonObject<T extends object>(response: APIResponse): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      `Expected JSON object response from ${response.url()}, got ${response.status()}. Body preview: ${await responseTextPreview(response)}`,
      { cause: error }
    );
  }

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
