import { expect, test, type APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin Customer API Tests @api @regression", () => {
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
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ staffIds: [] })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
  });

  test("[CUS_009] POST /customers rejects username shorter than 4", async () => {
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ username: "abc" })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
  });

  test("[CUS_003] POST /customers rejects password shorter than 6", async () => {
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ password: "123" })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
  });

  test("[CUS_010] POST /customers rejects oversized email", async () => {
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ email: `${"a".repeat(95)}@b.com` })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
  });

  test("[CUS_011] POST /customers rejects invalid phone format", async () => {
    const response = await admin.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: TestDataFactory.buildCustomerPayload({ phone: "9999999999" })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/customers"
    });
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
      await expectApiErrorBody(duplicateResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/customers"
      });

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
        await expectApiErrorBody(deleteWithContract, {
          status: 400,
          code: "BAD_REQUEST",
          path: `/api/v1/admin/customers/${customerWithContract.customer.id}`
        });
      } finally {
        await TempEntityHelper.xoaContractTam(admin, customerWithContract);
      }

      const missingDelete = await admin.delete("/api/v1/admin/customers/999999", {
        failOnStatusCode: false
      });
      await expectApiErrorBody(missingDelete, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/customers/999999"
      });

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
    test.fail(true, "Backend currently checks rent contracts only and may still allow delete despite existing sale contract.");
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
