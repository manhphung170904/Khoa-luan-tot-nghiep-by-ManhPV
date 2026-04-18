import { test, expect } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectArrayBody, expectPageBody } from "@api/apiContractUtils";

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
    test(`${module.id} rejects anonymous access with API auth status @smoke @regression`, async ({ anonymousApi }) => {
      const response = await anonymousApi.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED"
      });
    });

    test(`${module.id} rejects staff role @regression`, async ({ staffApi }) => {
      const response = await staffApi.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
      await expectApiErrorBody(response, {
        status: 403,
        code: "FORBIDDEN"
      });
    });

    test(`${module.id} returns customer-scoped payload @smoke @regression`, async ({ customerApi }) => {
      const response = await customerApi.get(module.path, { failOnStatusCode: false, maxRedirects: 0 });
      expect(response.headers()["content-type"] ?? "").toContain("application/json");
      if (module.expectsPage) {
        const body = await expectPageBody<{
          content?: Array<Record<string, unknown>>;
          totalElements?: number;
        }>(response, { status: 200 });
        expect(Array.isArray(body.content)).toBeTruthy();
        expect(typeof body.totalElements).toBe("number");
        if ((body.content?.length ?? 0) > 0) {
          expect(typeof body.content?.[0]?.id).toBe("number");
        }
      } else {
        const body = await expectArrayBody<Record<string, unknown>>(response, 200);
        if (body.length > 0) {
          expect(typeof body[0]!.id).toBe("number");
        }
      }
    });
  }
});
