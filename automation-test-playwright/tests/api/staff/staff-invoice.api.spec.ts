import { test, expect } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

test.describe("Staff Invoice CRUD API Tests @regression", () => {
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

  test("API-STF-INV-001 rejects anonymous create access with API auth status", async ({ playwright }) => {
    const anonymous = await createAnonymousContext(playwright);
    try {
      const response = await anonymous.post("/api/v1/staff/invoices", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: validPayload
      });
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/staff/invoices"
      });
    } finally {
      await anonymous.dispose();
    }
  });

  test("API-STF-INV-002 rejects customer role on staff invoice search", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer");
    try {
      const response = await customer.get("/api/v1/staff/invoices?page=1&size=10", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      await expectApiErrorBody(response, {
        status: 403,
        code: "FORBIDDEN",
        path: "/api/v1/staff/invoices"
      });
    } finally {
      await customer.dispose();
    }
  });

  test.describe.serial("Staff invoice lifecycle", () => {
    test("API-STF-INV-003 staff creates invoice for assigned contract", async () => {
      const response = await staffContext.post("/api/v1/staff/invoices", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: validPayload
      });
      await expectApiMessage(response, {
        status: 200,
        message: apiExpectedMessages.staff.invoices.create,
        dataMode: "null"
      });

      const rows = await MySqlDbClient.query<{ id: number; total_amount: number; status: string }>(
        "SELECT id, total_amount, status FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [validPayload.contractId, validPayload.month, validPayload.year]
      );
      expect(rows.length).toBe(1);
      createdInvoiceId = rows[0]!.id;
      expect(Number(rows[0]!.total_amount)).toBeGreaterThan(0);
      expect(rows[0]!.status).toBe("PENDING");

      const detailRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice_detail WHERE invoice_id = ?",
        [createdInvoiceId]
      );
      expect(Number(detailRows[0]?.count ?? 0)).toBeGreaterThan(0);
    });

    test("API-STF-INV-004 staff searches own invoices @smoke", async () => {
      const response = await staffContext.get("/api/v1/staff/invoices?page=1&size=20", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(response.headers()["content-type"] ?? "").toContain("application/json");
      const payload = await expectPageBody<{
        content?: Array<{ id: number; totalAmount?: number | string; status?: string }>;
        totalElements?: number;
      }>(response, { status: 200 });
      expect(typeof payload.totalElements).toBe("number");
      const createdItem = payload.content?.find((item) => item.id === createdInvoiceId);
      expect(createdItem).toBeDefined();
      expect(Number(createdItem?.totalAmount)).toBeGreaterThan(0);
      expect(createdItem?.status).toBeTruthy();
    });

    test("API-STF-INV-005 staff edits own invoice", async () => {
      const response = await staffContext.put(`/api/v1/staff/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: {
          ...validPayload,
          id: createdInvoiceId,
          totalAmount: 9999
        }
      });
      await expectApiMessage(response, {
        status: 200,
        message: apiExpectedMessages.staff.invoices.update,
        dataMode: "null"
      });

      const rows = await MySqlDbClient.query<{ total_amount: number }>(
        "SELECT total_amount FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(rows.length).toBe(1);
      expect(Number(rows[0]!.total_amount)).toBe(9999);

      const detailRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice_detail WHERE invoice_id = ?",
        [createdInvoiceId]
      );
      expect(Number(detailRows[0]?.count ?? 0)).toBeGreaterThan(0);
    });

    test("API-STF-INV-006 staff deletes own invoice", async () => {
      const response = await staffContext.delete(`/api/v1/staff/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      await expectApiMessage(response, {
        status: 200,
        message: apiExpectedMessages.staff.invoices.delete,
        dataMode: "null"
      });

      const searchResponse = await staffContext.get("/api/v1/staff/invoices?page=1&size=20", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const payload = await expectPageBody<{ content?: Array<{ id: number }> }>(searchResponse, { status: 200 });
      expect(payload.content?.some((item) => item.id === createdInvoiceId)).toBeFalsy();

      const invoiceRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      const detailRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice_detail WHERE invoice_id = ?",
        [createdInvoiceId]
      );
      expect(Number(invoiceRows[0]?.count ?? 0)).toBe(0);
      expect(Number(detailRows[0]?.count ?? 0)).toBe(0);
      createdInvoiceId = 0;
    });
  });
});



