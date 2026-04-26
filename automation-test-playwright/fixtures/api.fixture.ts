import { test as base, expect } from "@playwright/test";
import type { APIRequestContext, APIResponse, TestInfo } from "@playwright/test";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { attachApiResponse, type ApiDebugAttachmentOptions } from "@api/apiContractUtils";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";

type CleanupAction = () => Promise<void> | void;
type CleanupTask = CleanupAction | { label: string; action: CleanupAction };

export class ApiCleanupRegistry {
  private readonly tasks: CleanupTask[] = [];

  add(task: CleanupTask): void {
    this.tasks.push(task);
  }

  addLabeled(label: string, action: CleanupAction): void {
    this.add({ label, action });
  }

  addAll(tasks: CleanupTask[]): void {
    tasks.forEach((task) => this.add(task));
  }

  async flush(): Promise<void> {
    const errors: unknown[] = [];

    while (this.tasks.length > 0) {
      const task = this.tasks.pop();
      if (!task) {
        continue;
      }

      try {
        await this.runTask(task);
      } catch (error) {
        errors.push(error);
        const label = typeof task === "function" ? "anonymous cleanup task" : task.label;
        console.warn(`[API Cleanup Warning] ${label} failed:`, error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} API cleanup task(s) failed.`);
    }
  }

  private async runTask(task: CleanupTask): Promise<void> {
    if (typeof task === "function") {
      await task();
      return;
    }

    await task.action();
  }
}

type ApiFixtures = {
  adminApi: APIRequestContext;
  staffApi: APIRequestContext;
  customerApi: APIRequestContext;
  anonymousApi: APIRequestContext;
  apiDebug: {
    attachResponse(response: APIResponse, options?: ApiDebugAttachmentOptions): Promise<void>;
  };
  cleanupRegistry: ApiCleanupRegistry;
  testMetadata: void;
};

type TestMetadata = {
  testId?: string;
  layer?: "API" | "E2E" | "UI" | "UNKNOWN";
  actor?: string;
  feature?: string;
};

type TrackedApiResponse = {
  label: string;
  response: APIResponse;
};

const trackedApiMethods = new Set(["delete", "fetch", "get", "head", "patch", "post", "put"]);

function trackApiContext(context: APIRequestContext, label: string, responses: TrackedApiResponse[]): APIRequestContext {
  return new Proxy(context, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || !trackedApiMethods.has(property) || typeof value !== "function") {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return async (...args: unknown[]) => {
        const response = await value.apply(target, args);
        responses.push({ label: `${label}-${property}`, response });
        if (responses.length > 20) {
          responses.shift();
        }

        return response;
      };
    }
  }) as APIRequestContext;
}

async function attachFailedRunResponses(testInfo: TestInfo, responses: TrackedApiResponse[]): Promise<void> {
  if (!testInfo.status || testInfo.status === testInfo.expectedStatus) {
    return;
  }

  const recentResponses = responses.slice(-10);
  await Promise.all(
    recentResponses.map((item, index) =>
      attachApiResponse(testInfo, item.response, {
        name: `${String(index + 1).padStart(2, "0")}-${item.label}-${item.response.status()}`
      })
    )
  );
}

function parseTestMetadata(title: string): TestMetadata {
  const testId = title.match(/^\[([^\]]+)\]/)?.[1];
  const normalizedTitle = title.replace(/^\[[^\]]+\]\s*-\s*/, "");
  const segments = normalizedTitle.split(" - ").map((item) => item.trim()).filter(Boolean);
  const layerMatch = normalizedTitle.match(/\b(API|E2E|UI)\b/i)?.[1]?.toUpperCase();

  return {
    testId,
    layer: layerMatch === "API" || layerMatch === "E2E" || layerMatch === "UI" ? layerMatch : "UNKNOWN",
    actor: segments[0]?.replace(/^(API|E2E|UI)\s+/i, ""),
    feature: segments[1]
  };
}

function annotateTestMetadata(testInfo: TestInfo): void {
  const metadata = parseTestMetadata(testInfo.title);
  const annotations = [
    ["testId", metadata.testId],
    ["layer", metadata.layer],
    ["actor", metadata.actor],
    ["feature", metadata.feature]
  ] as const;

  for (const [type, description] of annotations) {
    if (!description) {
      continue;
    }

    testInfo.annotations.push({ type, description });
  }
}

export const test = base.extend<ApiFixtures>({
  testMetadata: [
    async ({}, use, testInfo) => {
      annotateTestMetadata(testInfo);
      await use(undefined);
    },
    { auto: true }
  ],

  cleanupRegistry: async ({}, use) => {
    const registry = new ApiCleanupRegistry();
    try {
      await use(registry);
    } finally {
      await registry.flush();
    }
  },

  apiDebug: async ({}, use, testInfo) => {
    await use({
      attachResponse: (response, options) => attachApiResponse(testInfo, response, options)
    });
  },

  adminApi: async ({ playwright }, use, testInfo) => {
    const context = await ApiSessionHelper.newContext(playwright, "admin");
    const responses: TrackedApiResponse[] = [];
    try {
      await use(trackApiContext(context, "admin", responses));
    } finally {
      await attachFailedRunResponses(testInfo, responses);
      await context.dispose();
    }
  },

  staffApi: async ({ playwright }, use, testInfo) => {
    const context = await ApiSessionHelper.newContext(playwright, "staff");
    const responses: TrackedApiResponse[] = [];
    try {
      await use(trackApiContext(context, "staff", responses));
    } finally {
      await attachFailedRunResponses(testInfo, responses);
      await context.dispose();
    }
  },

  customerApi: async ({ playwright }, use, testInfo) => {
    const context = await ApiSessionHelper.newContext(playwright, "customer");
    const responses: TrackedApiResponse[] = [];
    try {
      await use(trackApiContext(context, "customer", responses));
    } finally {
      await attachFailedRunResponses(testInfo, responses);
      await context.dispose();
    }
  },

  anonymousApi: async ({ playwright }, use, testInfo) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });
    const responses: TrackedApiResponse[] = [];
    try {
      await use(trackApiContext(context, "anonymous", responses));
    } finally {
      await attachFailedRunResponses(testInfo, responses);
      await context.dispose();
    }
  }
});

base.afterAll(async () => {
  await MySqlDbClient.close();
});

export { expect };
