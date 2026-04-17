import { test, expect } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact, expectStatusOneOf } from "@api/apiContractUtils";

type ReadonlyModule = {
  id: string;
  name: string;
  path: string;
};

const readOnlyModules: ReadonlyModule[] = [
  { id: "API-STF-READ-001", name: "Building", path: "/api/v1/staff/buildings?page=1&size=5" },
  { id: "API-STF-READ-002", name: "Lease Contract", path: "/api/v1/staff/contracts?page=1&size=5" },
  { id: "API-STF-READ-003", name: "Sale Contract", path: "/api/v1/staff/sale-contracts?page=1&size=5" },
  { id: "API-STF-READ-004", name: "Customer", path: "/api/v1/staff/customers?page=1&size=5" },
  { id: "API-STF-READ-005", name: "Invoice", path: "/api/v1/staff/invoices?page=1&size=5" }
];

test.describe("Staff API Read-only Contract Tests @api @regression", () => {
  for (const module of readOnlyModules) {
    test(`${module.id} rejects anonymous access with API auth status @smoke @regression`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright);
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expectStatusExact(response, 401, `${module.name} readonly API must reject anonymous staff access`);
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} rejects customer role @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "customer");
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expectStatusExact(response, 403, `${module.name} readonly API must reject customer role`);
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} returns JSON payload for staff @smoke @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expectStatusExact(response, 200, `${module.name} readonly search should succeed for staff role`);

        const payload = (await response.json()) as { content?: unknown[]; totalElements?: number };
        expect(Array.isArray(payload.content)).toBeTruthy();
        expect(typeof payload.totalElements).toBe("number");
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} rejects unsupported write path @extended`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await context.post(`${module.path}/add`, {
          failOnStatusCode: false,
          maxRedirects: 0,
          data: { attack: "should-not-exist" }
        });

        expectStatusOneOf(response, [404, 405], `${module.name} readonly API should not expose synthetic write route`);
      } finally {
        await context.dispose();
      }
    });
  }
});
