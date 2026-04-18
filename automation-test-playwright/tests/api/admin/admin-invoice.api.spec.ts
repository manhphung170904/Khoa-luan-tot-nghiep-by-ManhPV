import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin - kiem thu API invoice @regression", () => {
  let admin: APIRequestContext;

  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const dueDateMonth = prevMonth === 12 ? 1 : prevMonth + 1;
  const dueDateYear = prevMonth === 12 ? prevYear + 1 : prevYear;
  const dueDate = `${dueDateYear}-${String(dueDateMonth).padStart(2, "0")}-15`;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
    await MySqlDbClient.close();
  });

  test("[INV_001] POST /invoices tu choi chua dang nhap tao", async ({ request }) => {
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

  test("[INV_002] POST /invoices tu choi kieu month khong hop le", async () => {
    const response = await admin.post("/api/v1/admin/invoices", {
      failOnStatusCode: false,
      data: { ...TestDataFactory.buildInvoicePayload(), month: "Muoi Hai" }
    });
    const errorBody = await expectApiErrorBody<{ message?: string; errors?: Array<{ field?: string }> }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/invoices"
    });
    expect(errorBody.message).toMatch(/month|tháng|thang|integer/i);
  });

  test("[INV_015] POST /invoices tu choi current-month invoice creation", async () => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    try {
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
      expect(errorBody.message).toMatch(/current|tháng hiện tại|thang hien tai|liền trước|lien truoc|invoice month/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice WHERE contract_id = ? AND month = ? AND year = ?",
        [temp.id, currentMonth, currentYear]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, temp);
    }
  });

  test("[INV_003] POST /invoices tu choi khong ton tai contractId", async () => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    try {
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
      expect(errorBody.message).toMatch(/contract|hợp đồng|hop dong|không tìm thấy|khong tim thay/i);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, temp);
    }
  });

  test("[INV_004] POST /invoices tu choi mismatched customerId", async () => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          contractId: temp.id,
          customerId: 999999,
          dueDate
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(errorBody.message).toMatch(/customer|khách hàng|khach hang|không khớp|khong khop|hợp đồng|hop dong/i);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, temp);
    }
  });

  test("[INV_005] POST /invoices tu choi dueDate within invoice month", async () => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    try {
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
      expect(errorBody.message).toMatch(/due|han thanh toan|hạn thanh toán|ngay|ngày|sau thang lap hoa don|sau tháng lập hóa đơn/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM invoice WHERE contract_id = ? AND month = ? AND year = ?",
        [temp.id, prevMonth, prevYear]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, temp);
    }
  });

  test("[INV_016] PUT /invoices/{id} tu choi khong ton tai invoice", async () => {
    const temp = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.put("/api/v1/admin/invoices/999999", {
        failOnStatusCode: false,
        data: TestDataFactory.buildInvoicePayload({
          id: 999999,
          contractId: temp.id,
          customerId: temp.customer.id,
          dueDate
        })
      });
      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices/999999"
      });
    } finally {
      await TempEntityHelper.xoaContractTam(admin, temp);
    }
  });

  test("[INV_017] DELETE /invoices/{id} tu choi invoice khong ton tai", async () => {
    const response = await admin.delete("/api/v1/admin/invoices/999999", {
      failOnStatusCode: false
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/invoices/999999"
    });
  });

  test("[INV_018] PUT /invoices/status marks overdue invoices based on due date", async () => {
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

      const invoiceRows = await MySqlDbClient.query<{ id: number; status: string }>(
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
      expect(invoiceRows[0]!.status).toBe("PENDING");

      const statusUpdateResponse = await admin.put("/api/v1/admin/invoices/status", {
        failOnStatusCode: false
      });
      await expectApiMessage(statusUpdateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.updateStatus,
        dataMode: "null"
      });

      const overdueRows = await MySqlDbClient.query<{ status: string }>(
        "SELECT status FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(overdueRows[0]!.status).toBe("OVERDUE");
    } finally {
      if (createdInvoiceId) {
        await admin.delete(`/api/v1/admin/invoices/${createdInvoiceId}`, { failOnStatusCode: false });
      }
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });

  test("[INV_006] invoice tao/danh sach/loc/cap nhat/xac nhan/xoa theo vong doi voi temp contract", async () => {
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

      const invoiceRows = await MySqlDbClient.query<{
        id: number;
        total_amount: number;
      }>(
        `
          SELECT id, total_amount
          FROM invoice
          WHERE contract_id = ? AND month = ? AND year = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [tempContract.id, payload.month, payload.year]
      );
      expect(invoiceRows.length).toBe(1);
      createdInvoiceId = invoiceRows[0]!.id;
      expect(Number(invoiceRows[0]!.total_amount)).toBe(Number(payload.totalAmount));

      const utilityRows = await MySqlDbClient.query<{
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
        [tempContract.id, payload.month, payload.year]
      );
      expect(utilityRows.length).toBe(1);
      expect(utilityRows[0]!.electricity_old).toBe(0);
      expect(utilityRows[0]!.water_old).toBe(0);
      expect(utilityRows[0]!.electricity_new).toBe(Number(payload.electricityUsage));
      expect(utilityRows[0]!.water_new).toBe(Number(payload.waterUsage));

      const duplicateResponse = await admin.post("/api/v1/admin/invoices", {
        failOnStatusCode: false,
        data: payload
      });
      const duplicateError = await expectApiErrorBody<{ message?: string }>(duplicateResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices"
      });
      expect(duplicateError.message).toMatch(/duplicate|ton tai|tồn tại|da co|đã có|trung|hoa don|hóa đơn|thang|tháng|nam|năm/i);

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
          totalAmount: 19999,
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

      const updatedRows = await MySqlDbClient.query<{ total_amount: number }>(
        "SELECT total_amount FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(Number(updatedRows[0]!.total_amount)).toBe(19999);

      const updatedUtilityRows = await MySqlDbClient.query<{
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
        [tempContract.id, payload.month, payload.year]
      );
      expect(updatedUtilityRows.length).toBe(1);
      expect(updatedUtilityRows[0]!.electricity_old).toBe(0);
      expect(updatedUtilityRows[0]!.water_old).toBe(0);
      expect(updatedUtilityRows[0]!.electricity_new).toBe(22);
      expect(updatedUtilityRows[0]!.water_new).toBe(11);

      const confirmResponse = await admin.post(`/api/v1/admin/invoices/${createdInvoiceId}/confirm`, {
        failOnStatusCode: false
      });
      await expectApiMessage(confirmResponse, {
        status: 200,
        message: apiExpectedMessages.admin.invoices.confirm,
        dataMode: "null"
      });

      const paidRows = await MySqlDbClient.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [createdInvoiceId]);
      expect(paidRows[0]!.status).toBe("PAID");

      const missingConfirm = await admin.post("/api/v1/admin/invoices/999999/confirm", {
        failOnStatusCode: false
      });
      await expectApiErrorBody(missingConfirm, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/invoices/999999/confirm"
      });

      const updatePaidResponse = await admin.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        failOnStatusCode: false,
        data: {
          ...payload,
          id: createdInvoiceId,
          totalAmount: 99999
        }
      });
      const updatePaidError = await expectApiErrorBody<{ message?: string }>(updatePaidResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/invoices/${createdInvoiceId}`
      });
      expect(updatePaidError.message).toMatch(/paid|da thanh toan|đã thanh toán|khong the cap nhat|không thể cập nhật|dang cho xu ly|đang chờ xử lý/i);

      const unchangedRows = await MySqlDbClient.query<{ total_amount: number; status: string }>(
        "SELECT total_amount, status FROM invoice WHERE id = ?",
        [createdInvoiceId]
      );
      expect(Number(unchangedRows[0]!.total_amount)).toBe(19999);
      expect(unchangedRows[0]!.status).toBe("PAID");

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

      const deletedRows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [createdInvoiceId]);
      expect(deletedRows.length).toBe(0);

      const deletedUtilityRows = await MySqlDbClient.query<{ id: number }>(
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



