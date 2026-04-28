import { test as base, expect } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { attachApiResponse, type ApiDebugAttachmentOptions } from "@api/apiContractUtils";
import { AdminBuildingApiClient, AdminCustomerApiClient, AuthApiClient, InvoiceApiClient, ProfileApiClient } from "@api/clients";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { ApiCleanupRegistry } from "./support/ApiCleanupRegistry";
import { annotateTestMetadata } from "./support/TestMetadataAnnotator";
import { attachFailedRunResponses, trackApiContext, type TrackedApiResponse } from "./support/ApiDebugTracker";

export { ApiCleanupRegistry };

type ApiFixtures = {
  adminApi: APIRequestContext;
  staffApi: APIRequestContext;
  customerApi: APIRequestContext;
  anonymousApi: APIRequestContext;
  adminBuildingApi: AdminBuildingApiClient;
  adminCustomerApi: AdminCustomerApiClient;
  authApi: AuthApiClient;
  invoiceApi: InvoiceApiClient;
  profileApi: ProfileApiClient;
  apiDebug: {
    attachResponse(response: APIResponse, options?: ApiDebugAttachmentOptions): Promise<void>;
  };
  cleanupRegistry: ApiCleanupRegistry;
  testMetadata: void;
};

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
  },

  adminBuildingApi: async ({ adminApi }, use) => {
    await use(new AdminBuildingApiClient(adminApi));
  },

  adminCustomerApi: async ({ adminApi }, use) => {
    await use(new AdminCustomerApiClient(adminApi));
  },

  authApi: async ({ anonymousApi }, use) => {
    await use(new AuthApiClient(anonymousApi));
  },

  invoiceApi: async ({ adminApi }, use) => {
    await use(new InvoiceApiClient(adminApi));
  },

  profileApi: async ({ customerApi }, use) => {
    await use(new ProfileApiClient(customerApi));
  }
});

base.afterAll(async () => {
  await MySqlDbClient.close();
});

export { expect };
