import { expect, type APIResponse } from "@playwright/test";

export type ApiCoverageStatus = "covered" | "partial" | "missing" | "defect-driven";
export type EndpointKind = "readonly" | "mutation" | "upload" | "otp-auth" | "background-trigger";
export type AuthScenario = "anonymous" | "invalid-session" | "wrong-role" | "happy-path" | "validation" | "business-rule";

export type ExpectedApiContract = {
  success?: number[];
  anonymous?: number[];
  invalidSession?: number[];
  wrongRole?: number[];
  validation?: number[];
  businessRule?: number[];
};

export function expectStatusExact(response: APIResponse, expected: number, context: string): void {
  expect(
    response.status(),
    `${context}: expected HTTP ${expected}, got ${response.status()}`
  ).toBe(expected);
}

export function expectStatusOneOf(response: APIResponse, expected: number[], context: string): void {
  expect(
    expected,
    `${context}: expected one of [${expected.join(", ")}], got ${response.status()}`
  ).toContain(response.status());
}

export function expectSuccessStatus(response: APIResponse, context: string): void {
  expectStatusExact(response, 200, context);
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

export async function expectMessageBody(response: APIResponse, status: number): Promise<string> {
  expectStatusExact(response, status, "Unexpected message response status");
  const payload = await expectJsonObject<{ message?: string }>(response);
  expect(typeof payload.message).toBe("string");
  return payload.message ?? "";
}
