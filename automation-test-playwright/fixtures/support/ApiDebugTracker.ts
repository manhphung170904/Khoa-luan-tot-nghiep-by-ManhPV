import type { APIRequestContext, APIResponse, TestInfo } from "@playwright/test";
import { attachApiResponse, type ApiDebugAttachmentOptions } from "@api/apiContractUtils";

export type TrackedApiResponse = {
  label: string;
  response: APIResponse;
  request: ApiDebugAttachmentOptions["request"];
};

const trackedApiMethods = new Set(["delete", "fetch", "get", "head", "patch", "post", "put"]);
const sensitiveOptionKeys = new Set(["authorization", "cookie", "password", "token", "accesstoken", "refreshtoken"]);

function sanitizeApiRequestValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[MaxDepth]";
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer length=${value.length}]`;
  }

  if (typeof value === "string") {
    return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeApiRequestValue(item, depth + 1));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveOptionKeys.has(key.toLowerCase()) ? "[redacted]" : sanitizeApiRequestValue(item, depth + 1)
    ])
  );
}

export function trackApiContext(
  context: APIRequestContext,
  label: string,
  responses: TrackedApiResponse[]
): APIRequestContext {
  return new Proxy(context, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || !trackedApiMethods.has(property) || typeof value !== "function") {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return async (...args: unknown[]) => {
        const response = await value.apply(target, args);
        responses.push({
          label: `${label}-${property}`,
          response,
          request: {
            actor: label,
            method: property.toUpperCase(),
            path: typeof args[0] === "string" ? args[0] : String(args[0]),
            options: sanitizeApiRequestValue(args[1])
          }
        });
        if (responses.length > 20) {
          responses.shift();
        }

        return response;
      };
    }
  }) as APIRequestContext;
}

export async function attachFailedRunResponses(
  testInfo: TestInfo,
  responses: TrackedApiResponse[]
): Promise<void> {
  if (!testInfo.status || testInfo.status === testInfo.expectedStatus) {
    return;
  }

  const recentResponses = responses.slice(-10);
  await Promise.all(
    recentResponses.map((item, index) =>
      attachApiResponse(testInfo, item.response, {
        name: `${String(index + 1).padStart(2, "0")}-${item.label}-${item.response.status()}`,
        request: item.request
      })
    )
  );
}
