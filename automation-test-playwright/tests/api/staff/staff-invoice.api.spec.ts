import { test, expect, type APIRequestContext } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact, expectSuccessStatus } from "@api/apiContractUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

test.describe("Staff Invoice CRUD API Tests", () => {
  let adminContext: APIRequestContext;
  let staffContext: APIRequestContext;
  let tempContract: Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;
  let createdInvoiceId = 0;
  let validPayload: Record<string, unknown>;

  test.beforeAll(async ({ playwright }) => {
    adminContext = await createRoleContext(playwright, "admin");
    tempContract = await TempEntityHelper.taoContractTam(adminContext);
    staffContext = await createRoleContext(playwright, "staff", tempContract.staff.username);
    validPayload = TestDataFactory.buildInvoicePayload({
      contractId: tempContract.id,
      customerId: tempContract.customer.id,
      details: [{ description: "Staff created invoice", amount: 1500000 }]
    });
  });

  test.afterAll(async () => {
    if (createdInvoiceId) {
      await MySqlDbClient.execute("DELETE FROM invoice_detail WHERE invoice_id = ?", [createdInvoiceId]);
      await MySqlDbClient.execute("DELETE FROM invoice WHERE id = ?", [createdInvoiceId]);
    }

    await staffContext.dispose();
    await TempEntityHelper.xoaContractTam(adminContext, tempContract);
    await adminContext.dispose();
    await MySqlDbClient.close();
  });

  test("API-STF-INV-001 rejects anonymous create access with API auth status @regression", async ({ playwright }) => {
    const anonymous = await createAnonymousContext(playwright);
    try {
      const response = await anonymous.post("/api/v1/staff/invoices", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: validPayload
      });
      expectStatusExact(response, 401, "Staff invoice create must reject anonymous access");
    } finally {
      await anonymous.dispose();
    }
  });

  test("API-STF-INV-002 rejects customer role on staff invoice search @regression", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer");
    try {
      const response = await customer.get("/api/v1/staff/invoices?page=1&size=10", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 403, "Customer role must be forbidden from staff invoice search");
    } finally {
      await customer.dispose();
    }
  });

  test.describe.serial("Staff invoice lifecycle", () => {
    test("API-STF-INV-003 staff creates invoice for assigned contract @regression", async () => {
      const response = await staffContext.post("/api/v1/staff/invoices", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: validPayload
      });
      expectSuccessStatus(response, "Staff invoice creation should succeed");

      const rows = await MySqlDbClient.query<{ id: number }>(
        "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [validPayload.contractId, validPayload.month, validPayload.year]
      );
      expect(rows.length).toBe(1);
      createdInvoiceId = rows[0]!.id;
    });

    test("API-STF-INV-004 staff searches own invoices @smoke @regression", async () => {
      const response = await staffContext.get("/api/v1/staff/invoices?page=1&size=20", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 200, "Staff invoice search should succeed");

      const payload = (await response.json()) as { content?: Array<{ id: number }> };
      expect(Array.isArray(payload.content)).toBeTruthy();
      expect(payload.content?.some((item) => item.id === createdInvoiceId)).toBeTruthy();
    });

    test("API-STF-INV-005 staff edits own invoice @regression", async () => {
      const response = await staffContext.put(`/api/v1/staff/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: {
          ...validPayload,
          id: createdInvoiceId,
          totalAmount: 9999
        }
      });
      expectStatusExact(response, 200, "Staff invoice edit should succeed");

      const rows = await MySqlDbClient.query<{ total_amount: number }>(
        "SELECT total_amount FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(rows.length).toBe(1);
      expect(Number(rows[0]!.total_amount)).toBe(9999);
    });

    test("API-STF-INV-006 staff deletes own invoice @regression", async () => {
      const response = await staffContext.delete(`/api/v1/staff/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 200, "Staff invoice delete should succeed");

      const searchResponse = await staffContext.get("/api/v1/staff/invoices?page=1&size=20", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(searchResponse, 200, "Staff invoice search after delete should succeed");

      const payload = (await searchResponse.json()) as { content?: Array<{ id: number }> };
      expect(payload.content?.some((item) => item.id === createdInvoiceId)).toBeFalsy();
      createdInvoiceId = 0;
    });
  });
});
