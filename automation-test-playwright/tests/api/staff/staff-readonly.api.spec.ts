import { test, expect } from '@playwright/test';
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact } from "@api/apiContractUtils";

type ReadonlyModule = {
  id: string;
  name: string;
  path: string;
};

const readOnlyModules: ReadonlyModule[] = [
  { id: "API-STF-READ-001", name: "Building", path: "/staff/building/search?page=1&size=5" },
  { id: "API-STF-READ-002", name: "Lease Contract", path: "/staff/contracts/search?page=1&size=5" },
  { id: "API-STF-READ-003", name: "Sale Contract", path: "/staff/sale-contracts/search?page=1&size=5" },
  { id: "API-STF-READ-004", name: "Customer", path: "/staff/customers/search?page=1&size=5" },
  { id: "API-STF-READ-005", name: "Invoice", path: "/staff/invoices/search?page=1&size=5" }
];

test.describe("Staff API Read-only Contract Tests", () => {
  for (const module of readOnlyModules) {
    test(`${module.id} rejects anonymous access with API auth status`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright);
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expect([401, 403]).toContain(response.status());
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} rejects customer role`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "customer");
      try {
        const response = await context.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
        expect([403, 404]).toContain(response.status());
      } finally {
        await context.dispose();
      }
    });

    test(`${module.id} returns JSON payload for staff`, async ({ playwright }) => {
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

    test(`${module.id} rejects unsupported write path`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await context.post(`${module.path}/add`, {
          failOnStatusCode: false,
          maxRedirects: 0,
          data: { attack: "should-not-exist" }
        });

        expect([403, 404, 405]).toContain(response.status());
      } finally {
        await context.dispose();
      }
    });
  }
});

