import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectLooseApiText, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Admin - API Customer @regression @api", () => {
  const missingSmallId = TestDataFactory.missingSmallId;

  test("[CUS-001] - API Admin Customer - Authentication - Create Customer Without Login Rejection", async ({ request }) => {
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

  test("[CUS-002] - API Admin Customer - Staff Assignment - Empty Staff Assignment Validation", async ({ adminCustomerApi }) => {
    const username = TestDataFactory.taoUsername("cusemptystaff");
    const response = await adminCustomerApi.create(TestDataFactory.buildCustomerPayload({ username, staffIds: [] }));
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expectLooseApiText(errorBody.message, /staff|nhan vien/i);

    const rows = await TestDbRepository.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE username = ?", [username]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CUS-009] - API Admin Customer - Username - Minimum Length Validation", async ({ adminApi: admin, adminCustomerApi, cleanupRegistry }) => {
    const shortUsername = "abc";
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    const response = await adminCustomerApi.create(TestDataFactory.buildCustomerPayload({ username: shortUsername, staffIds: [tempStaff.id] }));
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/username|dang nh?p|t nh?t|min/i);

    const rows = await TestDbRepository.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE username = ?", [shortUsername]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CUS-003] - API Admin Customer - Password - Minimum Length Validation", async ({ adminApi: admin, adminCustomerApi, cleanupRegistry }) => {
    const username = TestDataFactory.taoUsername("cuspwd");
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    const response = await adminCustomerApi.create(TestDataFactory.buildCustomerPayload({ username, password: "123", staffIds: [tempStaff.id] }));
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/password|m?t kh?u|t nh?t|min/i);

    const rows = await TestDbRepository.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE username = ?", [username]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CUS-010] - API Admin Customer - Email - Maximum Length Validation", async ({ adminApi: admin, adminCustomerApi, cleanupRegistry }) => {
    const oversizedEmail = `${"a".repeat(95)}@b.com`;
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    const response = await adminCustomerApi.create(TestDataFactory.buildCustomerPayload({ email: oversizedEmail, staffIds: [tempStaff.id] }));
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expect(errorBody.message).toMatch(/email|d?a ch? email|khng h?p l?|t?i da/i);

    const rows = await TestDbRepository.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE email = ?", [oversizedEmail]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CUS-011] - API Admin Customer - Phone Number - Invalid Format Validation", async ({ adminApi: admin, adminCustomerApi, cleanupRegistry }) => {
    const invalidPhone = "9999999999";
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    const response = await adminCustomerApi.create(TestDataFactory.buildCustomerPayload({ phone: invalidPhone, staffIds: [tempStaff.id] }));
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
    expectLooseApiText(errorBody.message, /phone|dien thoai|khong hop le/i);

    const rows = await TestDbRepository.query<{ count: number }>("SELECT COUNT(*) AS count FROM customer WHERE phone = ?", [invalidPhone]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CUS-004] - API Admin Customer - Customer Lifecycle - Create List Search and Delete Flow", async ({ adminApi: admin, adminCustomerApi }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const customerPayload = TestDataFactory.buildCustomerPayload({ staffIds: [tempStaff.id] });
    let createdCustomerId = 0;

    try {
      const createResponse = await adminCustomerApi.create(customerPayload);
      await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.customers.create,
        dataMode: "null"
      });

      const customerRows = await TestDbRepository.query<{
        id: number;
        email: string;
        full_name: string;
      }>("SELECT id, email, full_name FROM customer WHERE username = ? LIMIT 1", [String(customerPayload.username)]);

      expect(customerRows.length).toBe(1);
      createdCustomerId = customerRows[0]!.id;
      expect(customerRows[0]!.email).toBe(customerPayload.email);
      expect(customerRows[0]!.full_name).toBe(customerPayload.fullName);

      const duplicateResponse = await adminCustomerApi.create(customerPayload);
      const duplicateError = await expectApiErrorBody<{ message?: string }>(duplicateResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/customers"
      });
      expectLooseApiText(duplicateError.message, /username|email|phone|ten dang nhap|ton tai|trung/i);
      const duplicateRows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM customer WHERE username = ? OR email = ? OR phone = ?",
        [String(customerPayload.username), String(customerPayload.email), String(customerPayload.phone)]
      );
      expect(Number(duplicateRows[0]?.count ?? 0)).toBe(1);

      const listResponse = await adminCustomerApi.list({ page: 1, size: 50, fullName: String(customerPayload.fullName) });
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
        const deleteWithContract = await adminCustomerApi.deleteById(customerWithContract.customer.id);
        const deleteWithContractError = await expectApiErrorBody<{ message?: string }>(deleteWithContract, {
          status: 400,
          code: "BAD_REQUEST",
          path: `/api/v1/admin/customers/${customerWithContract.customer.id}`
        });
        expectLooseApiText(deleteWithContractError.message, /contract|hop dong|khong the xoa|khach hang|lien quan/i);

        const stillExistsRows = await TestDbRepository.query<{ count: number }>(
          "SELECT COUNT(*) AS count FROM customer WHERE id = ?",
          [customerWithContract.customer.id]
        );
        expect(Number(stillExistsRows[0]?.count ?? 0)).toBe(1);
      } finally {
        await TempEntityHelper.xoaContractTam(admin, customerWithContract);
      }

      const missingDelete = await adminCustomerApi.deleteById(missingSmallId);
      const missingDeleteError = await expectApiErrorBody<{ message?: string }>(missingDelete, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/customers/${missingSmallId}`
      });
      expectLooseApiText(missingDeleteError.message, /customer|khach hang|khong ton tai|khong tim thay|not found/i);

      const deleteResponse = await adminCustomerApi.deleteById(createdCustomerId);
      await expectApiMessage(deleteResponse, {
        status: 200,
        message: apiExpectedMessages.admin.customers.delete,
        dataMode: "null"
      });

      const deletedRows = await TestDbRepository.query<{ id: number }>("SELECT id FROM customer WHERE id = ?", [createdCustomerId]);
      expect(deletedRows.length).toBe(0);
      createdCustomerId = 0;
    } finally {
      if (createdCustomerId) {
        await adminCustomerApi.deleteById(createdCustomerId);
      }
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
    }
  });

  test("[CUS-012] - API Admin Customer - Delete Customer - Active Sale Contract Deletion Restriction", async ({ adminApi: admin, adminCustomerApi, cleanupRegistry }) => {
    const customerWithSaleContract = await TempEntityHelper.taoSaleContractTam(admin);
    cleanupRegistry.addLabeled(`Delete sale contract scenario ${customerWithSaleContract.id}`, () => TempEntityHelper.xoaSaleContractTam(admin, customerWithSaleContract));

    const deleteWithSaleContract = await adminCustomerApi.deleteById(customerWithSaleContract.customer.id);
    await expectApiErrorBody(deleteWithSaleContract, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/customers/${customerWithSaleContract.customer.id}`
    });
  });
});
