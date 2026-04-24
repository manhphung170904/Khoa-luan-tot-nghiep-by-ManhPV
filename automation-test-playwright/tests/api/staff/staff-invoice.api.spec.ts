import { test, expect } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;
type PlaywrightLike = Parameters<typeof createRoleContext>[0];
type StaffInvoiceScenario = {
  adminContext: APIRequestContext;
  staffContext: APIRequestContext;
  tempContract: TempContract;
  validPayload: Record<string, unknown>;
};

const createStaffInvoiceScenario = async (playwright: PlaywrightLike): Promise<StaffInvoiceScenario> => {
  const adminContext = await createRoleContext(playwright, "admin");
  const tempContract = await TempEntityHelper.taoContractTam(adminContext);
  const staffContext = await createRoleContext(playwright, "staff", tempContract.staff.username);
  const validPayload = TestDataFactory.buildInvoicePayload({
    contractId: tempContract.id,
    customerId: tempContract.customer.id,
    details: [{ description: "Staff created invoice", amount: 1500000 }]
  });

  return {
    adminContext,
    staffContext,
    tempContract,
    validPayload
  };
};

const cleanupInvoiceById = async (invoiceId?: number): Promise<void> => {
  if (!invoiceId) {
    return;
  }

  await MySqlDbClient.execute("DELETE FROM invoice_detail WHERE invoice_id = ?", [invoiceId]).catch(() => {});
  await MySqlDbClient.execute("DELETE FROM invoice WHERE id = ?", [invoiceId]).catch(() => {});
};

const cleanupStaffInvoiceScenario = async (scenario?: Partial<StaffInvoiceScenario>, invoiceId?: number): Promise<void> => {
  await cleanupInvoiceById(invoiceId);
  await scenario?.staffContext?.dispose().catch(() => {});
  if (scenario?.tempContract && scenario?.adminContext) {
    await TempEntityHelper.xoaContractTam(scenario.adminContext, scenario.tempContract).catch(() => {});
  }
  await scenario?.adminContext?.dispose().catch(() => {});
};

test.describe("Staff - API Invoice @regression", () => {
  test("[API-STF-INV-001] - API Staff Invoice - Authentication - Anonymous Create Access Rejection", async ({ playwright }) => {
    const scenario = await createStaffInvoiceScenario(playwright);
    const anonymous = await createAnonymousContext(playwright);

    try {
      const response = await anonymous.post("/api/v1/staff/invoices", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: scenario.validPayload
      });
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/staff/invoices"
      });
    } finally {
      await anonymous.dispose();
      await cleanupStaffInvoiceScenario(scenario);
    }
  });

  test("[API-STF-INV-002] - API Staff Invoice - Authorization - Customer Role Rejection", async ({ playwright }) => {
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

  test("[API-STF-INV-003] - API Staff Invoice - Create Invoice - Assigned Contract Invoice Creation", async ({ playwright }) => {
    const scenario = await createStaffInvoiceScenario(playwright);
    let createdInvoiceId = 0;

    try {
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

      const rows = await MySqlDbClient.query<{ id: number; total_amount: number; status: string }>(
        "SELECT id, total_amount, status FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
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
    } finally {
      await cleanupStaffInvoiceScenario(scenario, createdInvoiceId);
    }
  });

  test("[API-STF-INV-004] - API Staff Invoice - Listing - Assigned Invoice Retrieval @smoke", async ({ playwright }) => {
    const scenario = await createStaffInvoiceScenario(playwright);
    let createdInvoiceId = 0;

    try {
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

      const createdRows = await MySqlDbClient.query<{ id: number }>(
        "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
      );
      expect(createdRows.length).toBe(1);
      createdInvoiceId = createdRows[0]!.id;

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
    } finally {
      await cleanupStaffInvoiceScenario(scenario, createdInvoiceId);
    }
  });

  test("[API-STF-INV-005] - API Staff Invoice - Update Invoice - Owned Invoice Update", async ({ playwright }) => {
    const scenario = await createStaffInvoiceScenario(playwright);
    let createdInvoiceId = 0;

    try {
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

      const createdRows = await MySqlDbClient.query<{ id: number }>(
        "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
      );
      expect(createdRows.length).toBe(1);
      createdInvoiceId = createdRows[0]!.id;

      const response = await scenario.staffContext.put(`/api/v1/staff/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: {
          ...scenario.validPayload,
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
    } finally {
      await cleanupStaffInvoiceScenario(scenario, createdInvoiceId);
    }
  });

  test("[API-STF-INV-006] - API Staff Invoice - Delete Invoice - Owned Invoice Deletion", async ({ playwright }) => {
    const scenario = await createStaffInvoiceScenario(playwright);
    let createdInvoiceId = 0;

    try {
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

      const createdRows = await MySqlDbClient.query<{ id: number }>(
        "SELECT id FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [scenario.validPayload.contractId, scenario.validPayload.month, scenario.validPayload.year]
      );
      expect(createdRows.length).toBe(1);
      createdInvoiceId = createdRows[0]!.id;

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
    } finally {
      await cleanupStaffInvoiceScenario(scenario, createdInvoiceId);
    }
  });
});
