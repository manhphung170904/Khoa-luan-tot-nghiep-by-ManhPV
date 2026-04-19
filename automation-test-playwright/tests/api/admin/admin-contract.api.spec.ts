import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectObjectBody, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin - API Contract @api-write @regression", () => {
  test("[CTR-001] - API Admin Contract - Authentication - Create Contract Without Login Rejection", async ({ request }) => {
    const response = await request.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: TestDataFactory.buildContractPayload()
    });
    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/contracts"
    });
  });

  test("[CTR-002] - API Admin Contract - Rent Price - Negative Value Validation", async ({ adminApi }) => {
    const payload = TestDataFactory.buildContractPayload({ rentPrice: -5 });
    const response = await adminApi.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: payload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/contracts"
    });
    expect(errorBody.message).toMatch(/rent|giá|price/i);

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND rent_price = ?",
      [payload.customerId, payload.buildingId, payload.rentPrice]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CTR-005] - API Admin Contract - Contract Dates - End Date Before Start Date Validation", async ({ adminApi, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(adminApi);
    cleanupRegistry.add(() => TempEntityHelper.xoaContractTam(adminApi, temp));

    const payload = TestDataFactory.buildContractPayload({
      customerId: temp.customer.id,
      buildingId: temp.building.id,
      staffId: temp.staff.id,
      startDate: "2026-06-01",
      endDate: "2026-05-01"
    });
    const response = await adminApi.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: payload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/contracts"
    });
    expect(errorBody.message).toMatch(/end|start|ngày/i);

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND start_date = ? AND end_date = ?",
      [payload.customerId, payload.buildingId, payload.startDate, payload.endDate]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[CTR-011] - API Admin Contract - Metadata - Select Options Schema", async ({ adminApi }) => {
    const response = await adminApi.get("/api/v1/admin/contracts/metadata", {
      failOnStatusCode: false
    });
    const body = await expectObjectBody<{
      customers?: unknown[];
      buildings?: unknown[];
      staffs?: unknown[];
    }>(response, 200, ["customers", "buildings", "staffs"]);
    expect(Array.isArray(body.buildings)).toBeTruthy();
    expect(Array.isArray(body.staffs)).toBeTruthy();
  });

  test("[CTR-003] - API Admin Contract - Building Reference - Nonexistent Building Validation", async ({ adminApi, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(adminApi);
    cleanupRegistry.add(() => TempEntityHelper.xoaContractTam(adminApi, temp));
    try {
      const response = await adminApi.post("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildContractPayload({
          customerId: temp.customer.id,
          buildingId: 999999,
          staffId: temp.staff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/contracts"
      });
      expect(errorBody.message).toMatch(/building|bất động sản|tòa nhà/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND staff_id = ?",
        [temp.customer.id, 999999, temp.staff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {}
  });

  test("[CTR-004] - API Admin Contract - Customer Reference - Nonexistent Customer Validation", async ({ adminApi, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoContractTam(adminApi);
    cleanupRegistry.add(() => TempEntityHelper.xoaContractTam(adminApi, temp));
    try {
      const response = await adminApi.post("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildContractPayload({
          customerId: 999999,
          buildingId: temp.building.id,
          staffId: temp.staff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/contracts"
      });
      expect(errorBody.message).toMatch(/customer|khách hàng|không tìm thấy/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND staff_id = ?",
        [999999, temp.building.id, temp.staff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {}
  });

  test("[CTR-012] - API Admin Contract - Staff Assignment - Building Assignment Restriction", async ({ adminApi, cleanupRegistry }) => {
    const managedContract = await TempEntityHelper.taoContractTam(adminApi);
    const outsiderStaff = await TempEntityHelper.taoStaffTam(adminApi);
    cleanupRegistry.add(() => TempEntityHelper.xoaStaffTam(adminApi, outsiderStaff.id));
    cleanupRegistry.add(() => TempEntityHelper.xoaContractTam(adminApi, managedContract));

    try {
      const response = await adminApi.post("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildContractPayload({
          customerId: managedContract.customer.id,
          buildingId: managedContract.building.id,
          staffId: outsiderStaff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/contracts"
      });
      expect(errorBody.message).toMatch(/staff|phân công|building|tòa nhà/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND staff_id = ?",
        [managedContract.customer.id, managedContract.building.id, outsiderStaff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {}
  });

  test("[CTR-013] - API Admin Contract - Staff Assignment - Customer Assignment Restriction", async ({ adminApi, cleanupRegistry }) => {
    const assignedManager = await TempEntityHelper.taoStaffTam(adminApi);
    const contractStaff = await TempEntityHelper.taoStaffTam(adminApi);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_RENT");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(adminApi, assignedManager.id);
    await TempEntityHelper.capNhatPhanCongBuilding(adminApi, contractStaff.id, [tempBuilding.id]);
    cleanupRegistry.add(() => TempEntityHelper.xoaStaffTam(adminApi, assignedManager.id));
    cleanupRegistry.add(() => TempEntityHelper.xoaStaffTam(adminApi, contractStaff.id));
    cleanupRegistry.add(() => TempEntityHelper.xoaBuildingTam(adminApi, tempBuilding.id));
    cleanupRegistry.add(() => TempEntityHelper.xoaCustomerTam(adminApi, tempCustomer.id));
    cleanupRegistry.add(() => TempEntityHelper.capNhatPhanCongBuilding(adminApi, contractStaff.id, []));

    try {
      const response = await adminApi.post("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildContractPayload({
          customerId: tempCustomer.id,
          buildingId: tempBuilding.id,
          staffId: contractStaff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/contracts"
      });
      expect(errorBody.message).toMatch(/staff|phân công|customer|khách hàng/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND staff_id = ?",
        [tempCustomer.id, tempBuilding.id, contractStaff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {}
  });

  test("[CTR-014] - API Admin Contract - Update Contract - Nonexistent Contract Rejection", async ({ adminApi, cleanupRegistry }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(adminApi);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_RENT");
    await TempEntityHelper.capNhatPhanCongBuilding(adminApi, tempStaff.id, [tempBuilding.id]);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(adminApi, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongCustomer(adminApi, tempStaff.id, [tempCustomer.id]);
    cleanupRegistry.add(() => TempEntityHelper.xoaContractTam(adminApi, {
      id: 0,
      staff: tempStaff,
      customer: tempCustomer,
      building: tempBuilding
    }));

    const response = await adminApi.put("/api/v1/admin/contracts/999999999", {
      failOnStatusCode: false,
      data: TestDataFactory.buildContractPayload({
        customerId: tempCustomer.id,
        buildingId: tempBuilding.id,
        staffId: tempStaff.id
      })
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/contracts/999999999"
    });
    expect(errorBody.message).toMatch(/contract|hợp đồng|không tồn tại|không tìm thấy|not found/i);
  });

  test("[CTR-006] - API Admin Contract - Contract Lifecycle - Create List Filter Update Status Update and Delete Flow", async ({
    adminApi,
    cleanupRegistry
  }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(adminApi);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_RENT");
    await TempEntityHelper.capNhatPhanCongBuilding(adminApi, tempStaff.id, [tempBuilding.id]);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(adminApi, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongCustomer(adminApi, tempStaff.id, [tempCustomer.id]);
    cleanupRegistry.add(() => TempEntityHelper.xoaStaffTam(adminApi, tempStaff.id));
    cleanupRegistry.add(() => TempEntityHelper.xoaBuildingTam(adminApi, tempBuilding.id));
    cleanupRegistry.add(() => TempEntityHelper.xoaCustomerTam(adminApi, tempCustomer.id));
    cleanupRegistry.add(() => TempEntityHelper.capNhatPhanCongBuilding(adminApi, tempStaff.id, []));
    cleanupRegistry.add(() => TempEntityHelper.capNhatPhanCongCustomer(adminApi, tempStaff.id, []));

    let createdContractId = 0;

    try {
      const payload = TestDataFactory.buildContractPayload({
        customerId: tempCustomer.id,
        buildingId: tempBuilding.id,
        staffId: tempStaff.id
      });

      const createResponse = await adminApi.post("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        data: payload
      });
      await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.contracts.create,
        dataMode: "null"
      });

      const contractRows = await MySqlDbClient.query<{
        id: number;
        rent_price: number;
        rent_area: number;
      }>(
        `
          SELECT id, rent_price, rent_area
          FROM contract
          WHERE customer_id = ? AND building_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [tempCustomer.id, tempBuilding.id]
      );

      expect(contractRows.length).toBe(1);
      createdContractId = contractRows[0]!.id;
      expect(Number(contractRows[0]!.rent_price)).toBe(Number(payload.rentPrice));
      expect(contractRows[0]!.rent_area).toBe(payload.rentArea);

      const listResponse = await adminApi.get("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, customerId: tempCustomer.id }
      });
      const listBody = await expectPageBody<{
        content?: Array<{ id: number; customer?: string; building?: string; status?: string }>;
        totalElements?: number;
      }>(listResponse, { status: 200 });
      expect(listBody.content?.some((item) => item.id === createdContractId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdContractId);
      expect(createdItem?.customer).toBe(tempCustomer.fullName);
      expect(createdItem?.building).toBe(tempBuilding.name);
      expect(createdItem?.status).toBe(payload.status);

      const filterResponse = await adminApi.get("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        params: { buildingId: tempBuilding.id, page: 1, size: 10 }
      });
      const filterBody = await expectPageBody<{
        content?: Array<{ id: number; building?: string }>;
        totalElements?: number;
      }>(filterResponse, { status: 200 });
      expect(filterBody.content?.some((item) => item.id === createdContractId)).toBeTruthy();

      const updateResponse = await adminApi.put(`/api/v1/admin/contracts/${createdContractId}`, {
        failOnStatusCode: false,
        data: {
          ...payload,
          id: createdContractId,
          rentPrice: 30.5,
          status: "EXPIRED"
        }
      });
      await expectApiMessage(updateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.contracts.update,
        dataMode: "null"
      });

      const updatedRows = await MySqlDbClient.query<{ rent_price: number; status: string }>(
        "SELECT rent_price, status FROM contract WHERE id = ?",
        [createdContractId]
      );
      expect(Number(updatedRows[0]!.rent_price)).toBe(30.5);
      expect(updatedRows[0]!.status).toBe("EXPIRED");

      const statusUpdateResponse = await adminApi.put("/api/v1/admin/contracts/status", {
        failOnStatusCode: false
      });
      await expectApiMessage(statusUpdateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.contracts.updateStatus,
        dataMode: "null"
      });

      const missingDelete = await adminApi.delete("/api/v1/admin/contracts/999999", {
        failOnStatusCode: false
      });
      const missingDeleteError = await expectApiErrorBody<{ message?: string }>(missingDelete, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/contracts/999999"
      });
      expect(missingDeleteError.message).toMatch(/contract|hợp đồng|không tồn tại|không tìm thấy|not found/i);

      const deleteResponse = await adminApi.delete(`/api/v1/admin/contracts/${createdContractId}`, {
        failOnStatusCode: false
      });
      await expectApiMessage(deleteResponse, {
        status: 200,
        message: apiExpectedMessages.admin.contracts.delete,
        dataMode: "null"
      });

      const deletedRows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM contract WHERE id = ?", [createdContractId]);
      expect(deletedRows.length).toBe(0);
      createdContractId = 0;
    } finally {
      if (createdContractId) {
        cleanupRegistry.add(async () => {
          await adminApi.delete(`/api/v1/admin/contracts/${createdContractId}`, { failOnStatusCode: false });
        });
      }
    }
  });
});



