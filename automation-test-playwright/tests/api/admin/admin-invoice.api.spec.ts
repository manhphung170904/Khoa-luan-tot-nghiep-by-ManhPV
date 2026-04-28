import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Admin - API Invoice @regression @api", () => {
  const missingSmallId = TestDataFactory.missingSmallId;
  const invoiceStatus = TestDataFactory.invoiceStatus;
  const invoiceAmount = TestDataFactory.testAmount;

  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const dueDateMonth = prevMonth === 12 ? 1 : prevMonth + 1;
  const dueDateYear = prevMonth === 12 ? prevYear + 1 : prevYear;
  const dueDate = `${dueDateYear}-${String(dueDateMonth).padStart(2, "0")}-15`;

  async function findInvoiceByPeriod(contractId: number, month: number, year: number) {
    return TestDbRepository.query<{ id: number; total_amount: number; status?: string }>(
      `
        SELECT id, total_amount, status
        FROM invoice
        WHERE contract_id = ? AND month = ? AND year = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [contractId, month, year]
    );
  }

  async function findUtilityMeterByPeriod(contractId: number, month: number, year: number) {
    return TestDbRepository.query<{
      electricity_old: number;
      electricity_new: number;
      water_old: number;
      water_new: number;
    }>(
      `
        SELECT electricity_old, electricity_new, water_old, water_new
        FROM utility_meter
        WHERE contract_id = ? AND month = ? AND year = ?
        LIMIT 1
      `,
      [contractId, month, year]
    );
  }

  async function expectUtilityUsage(
    contractId: number,
    month: number,
    year: number,
    expected: { electricityNew: number; waterNew: number }
  ): Promise<void> {
    const utilityRows = await findUtilityMeterByPeriod(contractId, month, year);
    expect(utilityRows.length).toBe(1);
    expect(utilityRows[0]!.electricity_old).toBe(0);
    expect(utilityRows[0]!.water_old).toBe(0);
    expect(utilityRows[0]!.electricity_new).toBe(expected.electricityNew);
    expect(utilityRows[0]!.water_new).toBe(expected.waterNew);
  }

  test("[INV-001] - API Admin Invoice - Authentication - Create Invoice Without Login Rejection", async ({ request }) => {
    const response = await request.post("/api/v1/admin/invoices", {
      failOnStatusCode: false,
      data: TestDataFactory.buildInvoicePayload()
    });
    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/invoices"
    });
  });

  test("[INV-002] - API Admin Invoice - Invoice Month - Invalid Format Validation", async ({ adminApi: admin }) => {
    const response = await admin.post("/api/v1/admin/invoices", {
      failOnStatusCode: false,
      data: { ...TestDataFactory.buildInvoicePayload(), month: "Muoi Hai" }
    });
    const errorBody = await expectApiErrorBody<{ message?: string; errors?: Array<{ field?: string }> }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/invoices"
    });
    expect(errorBody.message).toMatch(/month|thang|integer/i);
  });

  test("[INV-015] - API Admin Invoice - Invoice Month - Current Month Creation Restriction", async ({ adminApi: admin, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    cleanupRegistry.addLabeled(`Delete contract scenario ${temp.id}`, () => TempEntityHelper.xoaContractTam(admin, temp));
    {
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const response = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          contractId: temp.id,
          customerId: temp.customer.id,
          month: currentMonth,
          year: currentYear,
          dueDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-28`
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(errorBody.message).toMatch(/current|thang hien tai|lien truoc|invoice month/i);

      const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice WHERE contract_id = ? AND month = ? AND year = ?",
        [temp.id, currentMonth, currentYear]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    }
  });

  test("[INV-003] - API Admin Invoice - Contract Reference - Nonexistent Contract Validation", async ({ adminApi: admin, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    cleanupRegistry.addLabeled(`Delete contract scenario ${temp.id}`, () => TempEntityHelper.xoaContractTam(admin, temp));
    {
      const response = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          contractId: -1,
          customerId: temp.customer.id,
          dueDate
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(errorBody.message).toMatch(/contract|hop dong|khong tim thay/i);
    }
  });

  test("[INV-004] - API Admin Invoice - Customer Reference - Contract Customer Mismatch Validation", async ({ adminApi: admin, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    cleanupRegistry.addLabeled(`Delete contract scenario ${temp.id}`, () => TempEntityHelper.xoaContractTam(admin, temp));
    {
      const response = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          contractId: temp.id,
          customerId: missingSmallId,
          dueDate
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(errorBody.message).toMatch(/customer|khach hang|khong khop|hop dong/i);
    }
  });

  test("[INV-005] - API Admin Invoice - Due Date - Same Invoice Month Restriction", async ({ adminApi: admin, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    cleanupRegistry.addLabeled(`Delete contract scenario ${temp.id}`, () => TempEntityHelper.xoaContractTam(admin, temp));
    {
      const sameMonthDueDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-15`;
      const response = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          contractId: temp.id,
          customerId: temp.customer.id,
          dueDate: sameMonthDueDate
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(errorBody.message).toMatch(/due|han thanh toan|ngay|sau thang lap hoa don/i);

      const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice WHERE contract_id = ? AND month = ? AND year = ?",
        [temp.id, prevMonth, prevYear]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    }
  });

  test("[INV-016] - API Admin Invoice - Update Invoice - Nonexistent Invoice Rejection", async ({ adminApi: admin, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    cleanupRegistry.addLabeled(`Delete contract scenario ${temp.id}`, () => TempEntityHelper.xoaContractTam(admin, temp));
    {
      const response = await admin.put(`/api/v1/admin/invoices/${missingSmallId}`, {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          id: missingSmallId,
          contractId: temp.id,
          customerId: temp.customer.id,
          dueDate
        })
      });
      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/invoices/${missingSmallId}`
      });
    }
  });

  test("[INV-017] - API Admin Invoice - Delete Invoice - Nonexistent Invoice Rejection", async ({ adminApi: admin }) => {
    const response = await admin.delete(`/api/v1/admin/invoices/${missingSmallId}`, {
      failOnStatusCode: false
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/invoices/${missingSmallId}`
    });
  });

  test("[INV-018] - API Admin Invoice - Status Update - Overdue Invoice Status Marking", async ({ adminApi: admin }) => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    let createdInvoiceId = 0;

    try {
      const overduePayload = TestDataFactory.buildInvoicePayload({
        contractId: tempContract.id,
        customerId: tempContract.customer.id,
        dueDate: `${dueDateYear}-${String(dueDateMonth).padStart(2, "0")}-01`
      });

      const createResponse = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: overduePayload
      });
      await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.create,
        dataMode: "null"
      });

      const invoiceRows = await TestDbRepository.query<{ id: number; status: string }>(
        `
          SELECT id, status
          FROM invoice
          WHERE contract_id = ? AND month = ? AND year = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [tempContract.id, overduePayload.month, overduePayload.year]
      );
      expect(invoiceRows.length).toBe(1);
      createdInvoiceId = invoiceRows[0]!.id;
      expect(invoiceRows[0]!.status).toBe(invoiceStatus.pending);

      const statusUpdateResponse = await admin.put("/api/v1/admin/invoices/status", {
        failOnStatusCode: false
      });
      await expectApiMessage(statusUpdateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.updateStatus,
        dataMode: "null"
      });

      const overdueRows = await TestDbRepository.query<{ status: string }>(
        "SELECT status FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(overdueRows[0]!.status).toBe(invoiceStatus.overdue);
    } finally {
      if (createdInvoiceId) {
        await admin.delete(`/api/v1/admin/invoices/${createdInvoiceId}`, { failOnStatusCode: false });
      }
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });

  test("[INV-006] - API Admin Invoice - Invoice Lifecycle - Create List Filter Update Confirm Payment and Delete Flow", async ({ adminApi: admin }) => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    let createdInvoiceId = 0;

    try {
      const payload = TestDataFactory.buildInvoicePayload({
        contractId: tempContract.id,
        customerId: tempContract.customer.id,
        dueDate
      });

      const createResponse = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: payload
      });
      await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.create,
        dataMode: "null"
      });

      const invoiceRows = await findInvoiceByPeriod(tempContract.id, Number(payload.month), Number(payload.year));
      expect(invoiceRows.length).toBe(1);
      createdInvoiceId = invoiceRows[0]!.id;
      expect(Number(invoiceRows[0]!.total_amount)).toBe(Number(payload.totalAmount));

      await expectUtilityUsage(tempContract.id, Number(payload.month), Number(payload.year), {
        electricityNew: Number(payload.electricityUsage),
        waterNew: Number(payload.waterUsage)
      });

      const duplicateResponse = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: payload
      });
      const duplicateError = await expectApiErrorBody<{ message?: string }>(duplicateResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(duplicateError.message).toMatch(/duplicate|ton tai|da co|trung|hoa don|thang|nam/i);

      const listResponse = await admin.get("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, customerId: tempContract.customer.id }
      });
      const listBody = await expectPageBody<{
        content?: Array<{ id: number; status?: string; month?: number; year?: number }>;
        totalElements?: number;
      }>(listResponse, { status: 200 });
      expect(listBody.content?.some((item) => item.id === createdInvoiceId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdInvoiceId);
      expect(createdItem?.status).toBe(payload.status);
      expect(createdItem?.month).toBe(Number(payload.month));
      expect(createdItem?.year).toBe(Number(payload.year));

      const filterResponse = await admin.get("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, month: Number(payload.month), customerId: tempContract.customer.id }
      });
      const filterBody = await expectPageBody<{
        content?: Array<{ id: number; month?: number; customer?: string }>;
        totalElements?: number;
      }>(filterResponse, { status: 200 });
      expect(filterBody.content?.some((item) => item.id === createdInvoiceId)).toBeTruthy();

      const updateResponse = await admin.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        data: {
          ...payload,
          id: createdInvoiceId,
          totalAmount: invoiceAmount.adminInvoiceUpdateTotal,
          details: [],
          electricityUsage: 22,
          waterUsage: 11
        }
      });
      await expectApiMessage(updateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.update,
        dataMode: "null"
      });

      const updatedRows = await TestDbRepository.query<{ total_amount: number }>(
        "SELECT total_amount FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(Number(updatedRows[0]!.total_amount)).toBe(invoiceAmount.adminInvoiceUpdateTotal);

      await expectUtilityUsage(tempContract.id, Number(payload.month), Number(payload.year), {
        electricityNew: 22,
        waterNew: 11
      });

      const confirmResponse = await admin.post(`/api/v1/admin/invoices/${createdInvoiceId}/confirm`, {
        failOnStatusCode: false
      });
      await expectApiMessage(confirmResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.confirm,
        dataMode: "null"
      });

      const paidRows = await TestDbRepository.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [createdInvoiceId]);
      expect(paidRows[0]!.status).toBe(invoiceStatus.paid);

      const missingConfirm = await admin.post(`/api/v1/admin/invoices/${missingSmallId}/confirm`, {
        failOnStatusCode: false
      });
      await expectApiErrorBody(missingConfirm, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/invoices/${missingSmallId}/confirm`
      });

      const updatePaidResponse = await admin.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        data: {
          ...payload,
          id: createdInvoiceId,
          totalAmount: invoiceAmount.adminInvoiceRejectedUpdateTotal
        }
      });
      const updatePaidError = await expectApiErrorBody<{ message?: string }>(updatePaidResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/invoices/${createdInvoiceId}`
      });
      expect(updatePaidError.message).toMatch(/paid|da thanh toan|khong the cap nhat|dang cho xu ly/i);

      const unchangedRows = await TestDbRepository.query<{ total_amount: number; status: string }>(
        "SELECT total_amount, status FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(Number(unchangedRows[0]!.total_amount)).toBe(invoiceAmount.adminInvoiceUpdateTotal);
      expect(unchangedRows[0]!.status).toBe(invoiceStatus.paid);

      const statusUpdateResponse = await admin.put("/api/v1/admin/invoices/status", {
        failOnStatusCode: false
      });
      await expectApiMessage(statusUpdateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.updateStatus,
        dataMode: "null"
      });

      const deleteResponse = await admin.delete(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false
      });
      await expectApiMessage(deleteResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.delete,
        dataMode: "null"
      });

      const deletedRows = await TestDbRepository.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [createdInvoiceId]);
      expect(deletedRows.length).toBe(0);

      const deletedUtilityRows = await TestDbRepository.query<{ id: number }>(
        "SELECT id FROM utility_meter WHERE contract_id = ? AND month = ? AND year = ?",
        [tempContract.id, payload.month, payload.year]
      );
      expect(deletedUtilityRows.length).toBe(0);
      createdInvoiceId = 0;
    } finally {
      if (createdInvoiceId) {
        await admin.delete(`/api/v1/admin/invoices/${createdInvoiceId}`, { failOnStatusCode: false });
      }
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });
});
