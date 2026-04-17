import { test, expect, type APIRequestContext } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
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
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/staff/invoices"
      });
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
    test("API-STF-INV-003 staff creates invoice for assigned contract @regression", async () => {
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
      const payload = await expectPageBody<{ content?: Array<{ id: number }> }>(response, { status: 200 });
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
    });

    test("API-STF-INV-006 staff deletes own invoice @regression", async () => {
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
      createdInvoiceId = 0;
    });
  });
});
