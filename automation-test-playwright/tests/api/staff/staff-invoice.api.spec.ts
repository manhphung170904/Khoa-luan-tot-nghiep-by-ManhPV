import { test, expect } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { TestDbRepository } from "@db/repositories";
import { cleanupStaffInvoiceById, createStaffInvoiceScenario } from "@data/staffInvoiceScenario";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Staff - API Invoice @regression @api", () => {
  test("[API-STF-INV-001] - API Staff Invoice - Authentication - Anonymous Create Access Rejection", async ({ playwright, anonymousApi, cleanupRegistry }) => {
    const scenario = await createStaffInvoiceScenario(playwright, cleanupRegistry);

    const response = await anonymousApi.post("/api/v1/staff/invoices", {
      failOnStatusCode: false,
      maxRedirects: 0,
      data: scenario.validPayload
    });
    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/staff/invoices"
    });
  });

  test("[API-STF-INV-002] - API Staff Invoice - Authorization - Customer Role Rejection", async ({ customerApi }) => {
    const response = await customerApi.get("/api/v1/staff/invoices?page=1&size=10", {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    await expectApiErrorBody(response, {
      status: 403,
      code: "FORBIDDEN",
      path: "/api/v1/staff/invoices"
    });
  });

  test("[API-STF-INV-003] - API Staff Invoice - Create Invoice - Assigned Contract Invoice Creation", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createStaffInvoiceScenario(playwright, cleanupRegistry);
    const response = await scenario.staffContext.post("/api/v1/staff/invoices", {
      failOnStatusCode: false,
      maxRedirects: 0,
      data: scenario.validPayload
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.invoices.create,
      dataMode: "null"
    });

    const rows = await TestDbRepository.query<{ id: number; total_amount: number; status: string }>(
      "SELECT id, total_amount, status FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
      [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
    );
    expect(rows.length).toBe(1);
    const createdInvoiceId = rows[0]!.id;
    cleanupRegistry.addLabeled(`Delete staff-created invoice ${createdInvoiceId}`, () => cleanupStaffInvoiceById(createdInvoiceId));
    expect(Number(rows[0]!.total_amount)).toBeGreaterThan(0);
    expect(rows[0]!.status).toBe(TestDataFactory.invoiceStatus.pending);

    const detailRows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM invoice_detail WHERE invoice_id = ?",
      [createdInvoiceId]
    );
    expect(Number(detailRows[0]?.count ?? 0)).toBeGreaterThan(0);
  });

  test("[API-STF-INV-004] - API Staff Invoice - Listing - Assigned Invoice Retrieval @smoke", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createStaffInvoiceScenario(playwright, cleanupRegistry);
    const createResponse = await scenario.staffContext.post("/api/v1/staff/invoices", {
      failOnStatusCode: false,
      maxRedirects: 0,
      data: scenario.validPayload
    });
    await expectApiMessage(createResponse, {
      status: 200,
      message: apiExpectedMessages.staff.invoices.create,
      dataMode: "null"
    });

    const createdRows = await TestDbRepository.query<{ id: number }>(
      "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
      [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
    );
    expect(createdRows.length).toBe(1);
    const createdInvoiceId = createdRows[0]!.id;
    cleanupRegistry.addLabeled(`Delete staff-created invoice ${createdInvoiceId}`, () => cleanupStaffInvoiceById(createdInvoiceId));

    const response = await scenario.staffContext.get("/api/v1/staff/invoices?page=1&size=20", {
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

  test("[API-STF-INV-005] - API Staff Invoice - Update Invoice - Owned Invoice Update", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createStaffInvoiceScenario(playwright, cleanupRegistry);
    const createResponse = await scenario.staffContext.post("/api/v1/staff/invoices", {
      failOnStatusCode: false,
      maxRedirects: 0,
      data: scenario.validPayload
    });
    await expectApiMessage(createResponse, {
      status: 200,
      message: apiExpectedMessages.staff.invoices.create,
      dataMode: "null"
    });

    const createdRows = await TestDbRepository.query<{ id: number }>(
      "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
      [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
    );
    expect(createdRows.length).toBe(1);
    const createdInvoiceId = createdRows[0]!.id;
    cleanupRegistry.addLabeled(`Delete staff-created invoice ${createdInvoiceId}`, () => cleanupStaffInvoiceById(createdInvoiceId));

    const response = await scenario.staffContext.put(`/api/v1/staff/invoices/${createdInvoiceId}`, {
      failOnStatusCode: false,
      maxRedirects: 0,
      data: {
        ...scenario.validPayload,
        id: createdInvoiceId,
        totalAmount: TestDataFactory.testAmount.staffInvoiceUpdateTotal
      }
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.invoices.update,
      dataMode: "null"
    });

    const rows = await TestDbRepository.query<{ total_amount: number }>(
      "SELECT total_amount FROM invoice WHERE id = ?",
      [createdInvoiceId]
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0]!.total_amount)).toBe(TestDataFactory.testAmount.staffInvoiceUpdateTotal);

    const detailRows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM invoice_detail WHERE invoice_id = ?",
      [createdInvoiceId]
    );
    expect(Number(detailRows[0]?.count ?? 0)).toBeGreaterThan(0);
  });

  test("[API-STF-INV-006] - API Staff Invoice - Delete Invoice - Owned Invoice Deletion", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createStaffInvoiceScenario(playwright, cleanupRegistry);
    const createResponse = await scenario.staffContext.post("/api/v1/staff/invoices", {
      failOnStatusCode: false,
      maxRedirects: 0,
      data: scenario.validPayload
    });
    await expectApiMessage(createResponse, {
      status: 200,
      message: apiExpectedMessages.staff.invoices.create,
      dataMode: "null"
    });

    const createdRows = await TestDbRepository.query<{ id: number }>(
      "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
      [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
    );
    expect(createdRows.length).toBe(1);
    const createdInvoiceId = createdRows[0]!.id;
    cleanupRegistry.addLabeled(`Delete staff-created invoice ${createdInvoiceId}`, () => cleanupStaffInvoiceById(createdInvoiceId));

    const response = await scenario.staffContext.delete(`/api/v1/staff/invoices/${createdInvoiceId}`, {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.staff.invoices.delete,
      dataMode: "null"
    });

    const searchResponse = await scenario.staffContext.get("/api/v1/staff/invoices?page=1&size=20", {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    const payload = await expectPageBody<{ content?: Array<{ id: number }> }>(searchResponse, { status: 200 });
    expect(payload.content?.some((item) => item.id === createdInvoiceId)).toBeFalsy();

    const invoiceRows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM invoice WHERE id = ?",
      [createdInvoiceId]
    );
    const detailRows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM invoice_detail WHERE invoice_id = ?",
      [createdInvoiceId]
    );
    expect(Number(invoiceRows[0]?.count ?? 0)).toBe(0);
    expect(Number(detailRows[0]?.count ?? 0)).toBe(0);
  });
});
