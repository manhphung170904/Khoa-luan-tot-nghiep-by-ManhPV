import { expect, test } from "@fixtures/api.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin Contract API Tests @api @api-write @regression", () => {
  test("[CTR_001] POST /contracts rejects anonymous create", async ({ request }) => {
    const response = await request.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: TestDataFactory.buildContractPayload()
    });
    expect(response.status()).toBe(401);
  });

  test("[CTR_002] POST /contracts rejects negative rentPrice", async ({ adminApi }) => {
    const response = await adminApi.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: TestDataFactory.buildContractPayload({ rentPrice: -5 })
    });
    expect(response.status()).toBe(400);
  });

  test("[CTR_005] POST /contracts rejects endDate before startDate", async ({ adminApi }) => {
    const response = await adminApi.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: TestDataFactory.buildContractPayload({
        startDate: "2026-06-01",
        endDate: "2026-05-01"
      })
    });
    expect(response.status()).toBe(400);
  });

  test("[CTR_011] GET /contracts/metadata returns select options shape", async ({ adminApi }) => {
    const response = await adminApi.get("/api/v1/admin/contracts/metadata", {
      failOnStatusCode: false
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      customers?: unknown[];
      buildings?: unknown[];
      staffs?: unknown[];
    };
    expect(Array.isArray(body.customers)).toBeTruthy();
    expect(Array.isArray(body.buildings)).toBeTruthy();
    expect(Array.isArray(body.staffs)).toBeTruthy();
  });

  test("[CTR_003] POST /contracts rejects nonexistent buildingId", async ({ adminApi, cleanupRegistry }) => {
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
      expect(response.status()).toBe(400);
    } finally {}
  });

  test("[CTR_004] POST /contracts rejects nonexistent customerId", async ({ adminApi, cleanupRegistry }) => {
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
      expect(response.status()).toBe(400);
    } finally {}
  });

  test("[CTR_012] POST /contracts rejects staff outside building assignment", async ({ adminApi, cleanupRegistry }) => {
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
      expect(response.status()).toBe(400);
    } finally {}
  });

  test("[CTR_013] POST /contracts rejects staff outside customer assignment", async ({ adminApi, cleanupRegistry }) => {
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
      expect(response.status()).toBe(400);
    } finally {}
  });

  test("[CTR_014] PUT /contracts/{id} rejects nonexistent contract", async ({ adminApi }) => {
    const response = await adminApi.put("/api/v1/admin/contracts/999999999", {
      failOnStatusCode: false,
      data: TestDataFactory.buildContractPayload({
        customerId: 1,
        buildingId: 1,
        staffId: 1
      })
    });

    expect(response.status()).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBeTruthy();
  });

  test("[CTR_006] contract create/list/filter/update/status/delete lifecycle with temp data", async ({
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
      expect(createResponse.status()).toBe(200);
      const createBody = (await createResponse.json()) as { message?: string };
      expect(createBody.message).toBeTruthy();

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
      expect(listResponse.status()).toBe(200);
      const listBody = (await listResponse.json()) as {
        content?: Array<{ id: number; customer?: string; building?: string; status?: string }>;
        totalElements?: number;
      };
      expect(typeof listBody.totalElements).toBe("number");
      expect(listBody.content?.some((item) => item.id === createdContractId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdContractId);
      expect(createdItem?.customer).toBe(tempCustomer.fullName);
      expect(createdItem?.building).toBe(tempBuilding.name);
      expect(createdItem?.status).toBe(payload.status);

      const filterResponse = await adminApi.get("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        params: { buildingId: tempBuilding.id, page: 1, size: 10 }
      });
      expect(filterResponse.status()).toBe(200);
      const filterBody = (await filterResponse.json()) as {
        content?: Array<{ id: number; building?: string }>;
        totalElements?: number;
      };
      expect(typeof filterBody.totalElements).toBe("number");
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
      expect(updateResponse.status()).toBe(200);
      const updateBody = (await updateResponse.json()) as { message?: string };
      expect(updateBody.message).toBeTruthy();

      const updatedRows = await MySqlDbClient.query<{ rent_price: number; status: string }>(
        "SELECT rent_price, status FROM contract WHERE id = ?",
        [createdContractId]
      );
      expect(Number(updatedRows[0]!.rent_price)).toBe(30.5);
      expect(updatedRows[0]!.status).toBe("EXPIRED");

      const statusUpdateResponse = await adminApi.put("/api/v1/admin/contracts/status", {
        failOnStatusCode: false
      });
      expect(statusUpdateResponse.status()).toBe(200);
      const statusUpdateBody = (await statusUpdateResponse.json()) as { message?: string };
      expect(statusUpdateBody.message).toBeTruthy();

      const missingDelete = await adminApi.delete("/api/v1/admin/contracts/999999", {
        failOnStatusCode: false
      });
      expect(missingDelete.status()).toBe(400);
      const missingDeleteBody = (await missingDelete.json()) as { message?: string };
      expect(missingDeleteBody.message).toBeTruthy();

      const deleteResponse = await adminApi.delete(`/api/v1/admin/contracts/${createdContractId}`, {
        failOnStatusCode: false
      });
      expect(deleteResponse.status()).toBe(200);
      const deleteBody = (await deleteResponse.json()) as { message?: string };
      expect(deleteBody.message).toBeTruthy();

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
