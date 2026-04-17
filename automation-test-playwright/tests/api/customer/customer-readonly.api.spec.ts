import { test, expect } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact } from "@api/apiContractUtils";

type ReadonlyModule = {
  id: string;
  name: string;
  path: string;
  expectsPage?: boolean;
};

const readOnlyModules: ReadonlyModule[] = [
  { id: "API-CUS-READ-001", name: "Building", path: "/api/v1/customer/buildings" },
  { id: "API-CUS-READ-002", name: "Contract", path: "/api/v1/customer/contracts" },
  { id: "API-CUS-READ-003", name: "Transaction", path: "/api/v1/customer/transactions?page=1&size=5", expectsPage: true }
];

test.describe("Customer API Read-only Contract Tests @api @regression", () => {
  for (const module of readOnlyModules) {
    test(`${module.id} rejects anonymous access with API auth status @smoke @regression`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright);
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expectStatusExact(response, 401, `${module.name} readonly API must reject anonymous customer access`);
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} rejects staff role @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expectStatusExact(response, 403, `${module.name} readonly API must reject staff role`);
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} returns customer-scoped payload @smoke @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "customer");
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expectStatusExact(response, 200, `${module.name} readonly API should succeed for customer role`);

        const payload = (await response.json()) as { content?: unknown[]; totalElements?: number } | unknown[];
        if (module.expectsPage) {
          expect(Array.isArray((payload as { content?: unknown[] }).content)).toBeTruthy();
          expect(typeof (payload as { totalElements?: number }).totalElements).toBe("number");
        } else {
          expect(Array.isArray(payload)).toBeTruthy();
        }
      } finally {
        await context.dispose();
      }
    });
  }
});
