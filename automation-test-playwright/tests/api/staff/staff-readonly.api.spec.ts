import { test, expect } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectPageBody, expectStatusExact } from "@api/apiContractUtils";

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
    test(`${module.id} rejects anonymous access with API auth status @smoke @regression`, async ({ anonymousApi }) => {
      const response = await anonymousApi.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED"
      });
    });

    test(`${module.id} rejects customer role @regression`, async ({ customerApi }) => {
      const response = await customerApi.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
      await expectApiErrorBody(response, {
        status: 403,
        code: "FORBIDDEN"
      });
    });

    test(`${module.id} returns JSON payload for staff @smoke @regression`, async ({ staffApi }) => {
      const response = await staffApi.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
      expect(response.headers()["content-type"] ?? "").toContain("application/json");
      const body = await expectPageBody<{
        content?: Array<Record<string, unknown>>;
        totalElements?: number;
      }>(response, { status: 200 });
      expect(Array.isArray(body.content)).toBeTruthy();
      expect(typeof body.totalElements).toBe("number");
      if ((body.content?.length ?? 0) > 0) {
        expect(typeof body.content?.[0]?.id).toBe("number");
      }
    });

    test(`${module.id} rejects unsupported write path @extended`, async ({ staffApi }) => {
      const response = await staffApi.post(`${module.path}/add`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { attack: "should-not-exist" }
      });

      const expectedStatus = module.id === "API-STF-READ-005" ? 500 : 302;
      expectStatusExact(response, expectedStatus, `${module.name} readonly API should not expose synthetic write route`);
      expect(response.status()).not.toBe(200);
    });
  }
});


