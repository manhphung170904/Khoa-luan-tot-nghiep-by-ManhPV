import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin Customer API Tests @regression", () => {
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
    await MySqlDbClient.close();
  });

  test("[CUS_001] POST /customers rejects anonymous create", async ({ request }) => {
    const response = await request.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload()
    });
    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/customers"
    });
  });

  test("[CUS_002] POST /customers rejects empty staffIds", async () => {
    const username = `cus_empty_staff_${Date.now()}`;
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ username, staffIds: [] })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/staff|nhân viên|nhan vien/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE username = ?", [username]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CUS_009] POST /customers rejects username shorter than 4", async () => {
    const shortUsername = "abc";
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ username: shortUsername, staffIds: [tempStaff.id] })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/username|đăng nhập|dang nhap|ít nhất|it nhat|min/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE username = ?", [shortUsername]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
    await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
  });

  test("[CUS_003] POST /customers rejects password shorter than 6", async () => {
    const username = `cus_pwd_${Date.now()}`;
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ username, password: "123", staffIds: [tempStaff.id] })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/password|mat khau|it nhat|min/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE username = ?", [username]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
    await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
  });

  test("[CUS_010] POST /customers rejects oversized email", async () => {
    const oversizedEmail = `${"a".repeat(95)}@b.com`;
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ email: oversizedEmail, staffIds: [tempStaff.id] })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/email|địa chỉ email|dia chi email|không hợp lệ|khong hop le|tối đa|toi da/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE email = ?", [oversizedEmail]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
    await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
  });

  test("[CUS_011] POST /customers rejects invalid phone format", async () => {
    const invalidPhone = "9999999999";
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ phone: invalidPhone, staffIds: [tempStaff.id] })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/phone|điện thoại|dien thoai|không hợp lệ|khong hop le/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE phone = ?", [invalidPhone]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
    await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
  });

  test("[CUS_004] POST /customers creates customer and supports list/search/delete flow", async () => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const customerPayload = TestDataFactory.buildCustomerPayload({ staffIds: [tempStaff.id] });
    let createdCustomerId = 0;

    try {
      const createResponse = await admin.post("/api/v1/admin/customers", {
        failOnStatusCode: false,
        data: customerPayload
      });
      await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.customers.create,
        dataMode: "null"
      });

      const customerRows = await MySqlDbClient.query<{
        id: number;
        email: string;
        full_name: string;
      }>("SELECT id, email, full_name FROM customer WHERE username = ? LIMIT 1", [String(customerPayload.username)]);

      expect(customerRows.length).toBe(1);
      createdCustomerId = customerRows[0]!.id;
      expect(customerRows[0]!.email).toBe(customerPayload.email);
      expect(customerRows[0]!.full_name).toBe(customerPayload.fullName);

      const duplicateResponse = await admin.post("/api/v1/admin/customers", {
        failOnStatusCode: false,
        data: customerPayload
      });
      const duplicateError = await expectApiErrorBody<{ message?: string }>(duplicateResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/customers"
      });
      expect(duplicateError.message).toMatch(/username|email|phone|ten dang nhap|tên đăng nhập|ton tai|tồn tại|trung/i);
      const duplicateRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM customer WHERE username = ? OR email = ? OR phone = ?",
        [String(customerPayload.username), String(customerPayload.email), String(customerPayload.phone)]
      );
      expect(Number(duplicateRows[0]?.count ?? 0)).toBe(1);

      const listResponse = await admin.get("/api/v1/admin/customers", {
        failOnStatusCode: false,
        params: { page: 1, size: 50, fullName: String(customerPayload.fullName) }
      });
      const listBody = await expectPageBody<{
        content?: Array<{ id: number; fullName?: string; email?: string }>;
        totalElements?: number;
      }>(listResponse, { status: 200 });
      expect(listBody.content?.some((item) => item.id === createdCustomerId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdCustomerId);
      expect(createdItem?.fullName).toBe(customerPayload.fullName);
      expect(createdItem?.email).toBe(customerPayload.email);

      const customerWithContract = await TempEntityHelper.taoContractTam(admin);
      try {
        const deleteWithContract = await admin.delete(`/api/v1/admin/customers/${customerWithContract.customer.id}`, {
          failOnStatusCode: false
        });
        const deleteWithContractError = await expectApiErrorBody<{ message?: string }>(deleteWithContract, {
          status: 400,
          code: "BAD_REQUEST",
          path: `/api/v1/admin/customers/${customerWithContract.customer.id}`
        });
        expect(deleteWithContractError.message).toMatch(/contract|hợp đồng|hop dong|không thể xóa khách hàng đang có hợp đồng liên quan|khong the xoa khach hang dang co hop dong lien quan/i);

        const stillExistsRows = await MySqlDbClient.query<{ count: number }>(
          "SELECT COUNT(*) AS count FROM customer WHERE id = ?",
          [customerWithContract.customer.id]
        );
        expect(Number(stillExistsRows[0]?.count ?? 0)).toBe(1);
      } finally {
        await TempEntityHelper.xoaContractTam(admin, customerWithContract);
      }

      const missingDelete = await admin.delete("/api/v1/admin/customers/999999", {
        failOnStatusCode: false
      });
      const missingDeleteError = await expectApiErrorBody<{ message?: string }>(missingDelete, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/customers/999999"
      });
      expect(missingDeleteError.message).toMatch(/customer|khách hàng|khach hang|không tồn tại|khong ton tai|không tìm thấy|khong tim thay|not found/i);

      const deleteResponse = await admin.delete(`/api/v1/admin/customers/${createdCustomerId}`, {
        failOnStatusCode: false
      });
      await expectApiMessage(deleteResponse, {
        status: 200,
        message: apiExpectedMessages.admin.customers.delete,
        dataMode: "null"
      });

      const deletedRows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM customer WHERE id = ?", [createdCustomerId]);
      expect(deletedRows.length).toBe(0);
      createdCustomerId = 0;
    } finally {
      if (createdCustomerId) {
        await admin.delete(`/api/v1/admin/customers/${createdCustomerId}`, { failOnStatusCode: false });
      }
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
    }
  });

  test("[CUS_012] DELETE /customers/{id} should block delete when sale contracts exist on temp data", async () => {
    const customerWithSaleContract = await TempEntityHelper.taoSaleContractTam(admin);

    try {
      const deleteWithSaleContract = await admin.delete(`/api/v1/admin/customers/${customerWithSaleContract.customer.id}`, {
        failOnStatusCode: false
      });
      expect(deleteWithSaleContract.status()).toBe(400);
    } finally {
      await MySqlDbClient.execute("DELETE FROM sale_contract WHERE id = ?", [customerWithSaleContract.id]).catch(() => {});
      await TempEntityHelper.capNhatPhanCongCustomer(admin, customerWithSaleContract.staff.id, []).catch(() => {});
      await TempEntityHelper.capNhatPhanCongBuilding(admin, customerWithSaleContract.staff.id, []).catch(() => {});
      await TempEntityHelper.xoaCustomerTam(admin, customerWithSaleContract.customer.id).catch(() => {});
      await TempEntityHelper.xoaBuildingTam(admin, customerWithSaleContract.building.id).catch(() => {});
      await TempEntityHelper.xoaStaffTam(admin, customerWithSaleContract.staff.id).catch(() => {});
    }
  });
});



