import { test as base, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";

export type CleanupTask = () => Promise<void> | void;

export class ApiCleanupRegistry {
  private readonly tasks: CleanupTask[] = [];

  add(task: CleanupTask): void {
    this.tasks.push(task);
  }

  async flush(): Promise<void> {
    const errors: unknown[] = [];

    while (this.tasks.length > 0) {
      const task = this.tasks.pop();
      if (!task) {
        continue;
      }

      try {
        await task();
      } catch (error) {
        errors.push(error);
        console.warn("[API Cleanup Warning] Cleanup task failed:", error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} API cleanup task(s) failed.`);
    }
  }
}

type ApiFixtures = {
  adminApi: APIRequestContext;
  staffApi: APIRequestContext;
  customerApi: APIRequestContext;
  anonymousApi: APIRequestContext;
  cleanupRegistry: ApiCleanupRegistry;
};

export const test = base.extend<ApiFixtures>({
  cleanupRegistry: async ({}, use) => {
    const registry = new ApiCleanupRegistry();
    try {
      await use(registry);
    } finally {
      await registry.flush();
    }
  },

  adminApi: async ({ playwright }, use) => {
    const context = await ApiSessionHelper.newContext(playwright, "admin");
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  },

  staffApi: async ({ playwright }, use) => {
    const context = await ApiSessionHelper.newContext(playwright, "staff");
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  },

  customerApi: async ({ playwright }, use) => {
    const context = await ApiSessionHelper.newContext(playwright, "customer");
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  },

  anonymousApi: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  }
});

base.afterAll(async () => {
  await MySqlDbClient.close();
});

export { expect };
