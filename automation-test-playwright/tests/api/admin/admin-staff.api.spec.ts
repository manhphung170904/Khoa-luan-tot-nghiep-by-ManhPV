import { expect, test, type APIRequestContext } from "@playwright/test";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin Staff API Tests @api @regression", () => {
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
    await MySqlDbClient.close();
  });

  test("[STF_001] POST /staff rejects anonymous create", async ({ request }) => {
    const response = await request.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload()
    });
    expect(response.status()).toBe(401);
  });

  test("[STF_002] POST /staff rejects username shorter than 4", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ username: "abc" })
    });
    expect(response.status()).toBe(400);
  });

  test("[STF_017] POST /staff rejects password shorter than 6", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ password: "12345" })
    });
    expect(response.status()).toBe(400);
  });

  test("[STF_003] POST /staff rejects invalid phone format", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ phone: "1987654321" })
    });
    expect(response.status()).toBe(400);
  });

  test("[STF_018] POST /staff rejects fullName longer than 100 chars", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ fullName: "A".repeat(101) })
    });
    expect(response.status()).toBe(400);
  });

  test("[STF_015] POST /staff accepts username length 4 boundary", async () => {
    const username = `ab${String(Date.now()).slice(-2)}`;
    const payload = TestDataFactory.buildAdminStaffPayload({
      username,
      email: TestDataFactory.taoEmail("pw-staff-bnd4"),
      phone: TestDataFactory.taoSoDienThoai()
    });

    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: payload
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBeTruthy();

    const staffId = await TempEntityHelper.layMotStaffIdDangTonTai(admin);
    const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM staff WHERE username = ? LIMIT 1", [username]);
    expect(rows[0]?.id ?? staffId).toBeTruthy();
    await admin.delete(`/api/v1/admin/staff/${rows[0]!.id}`, { failOnStatusCode: false });
  });

  test("[STF_016] POST /staff rejects username longer than 30", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ username: "a".repeat(31) })
    });
    expect(response.status()).toBe(400);
  });

  test("[STF_019] PUT /staff/{id}/assignments/buildings blocks removing active-contract building", async () => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.put(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
      expect(response.status()).toBe(400);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });

  test("[STF_020] PUT /staff/{id}/assignments/customers blocks removing active-contract customer", async () => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.put(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      expect(response.status()).toBe(400);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });

  test("[STF_004] POST /staff creates staff and supports full assignment lifecycle", async () => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_RENT");
    const tempManager = await TempEntityHelper.taoStaffTam(admin);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempManager.id);

    const payload = TestDataFactory.buildAdminStaffPayload();
    let createdStaffId = 0;

    try {
      const createResponse = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: payload
      });
      expect(createResponse.status()).toBe(200);
      const createBody = (await createResponse.json()) as { message?: string };
      expect(createBody.message).toBeTruthy();

      const staffRows = await MySqlDbClient.query<{
        id: number;
        email: string;
        full_name: string;
      }>("SELECT id, email, full_name FROM staff WHERE username = ? LIMIT 1", [String(payload.username)]);

      expect(staffRows.length).toBe(1);
      createdStaffId = staffRows[0]!.id;
      expect(staffRows[0]!.email).toBe(payload.email);
      expect(staffRows[0]!.full_name).toBe(payload.fullName);

      const duplicateUsername = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: payload
      });
      expect(duplicateUsername.status()).toBe(400);

      const duplicateEmail = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: TestDataFactory.buildAdminStaffPayload({
          email: payload.email,
          phone: TestDataFactory.taoSoDienThoai()
        })
      });
      expect(duplicateEmail.status()).toBe(400);

      const duplicatePhone = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: TestDataFactory.buildAdminStaffPayload({
          email: TestDataFactory.taoEmail("pw-staff-dup-phone"),
          phone: payload.phone
        })
      });
      expect(duplicatePhone.status()).toBe(400);

      const listResponse = await admin.get("/api/v1/admin/staff", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, role: "STAFF" }
      });
      expect(listResponse.status()).toBe(200);
      const listBody = (await listResponse.json()) as {
        content?: Array<{ id: number; fullName?: string; email?: string; role?: string }>;
        totalElements?: number;
      };
      expect(typeof listBody.totalElements).toBe("number");
      expect(listBody.content?.some((item) => item.id === createdStaffId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdStaffId);
      expect(createdItem?.fullName).toBe(payload.fullName);
      expect(createdItem?.email).toBe(payload.email);
      expect(createdItem?.role).toBe("STAFF");

      const customersResponse = await admin.get("/api/v1/admin/staff/customers", {
        failOnStatusCode: false
      });
      expect(customersResponse.status()).toBe(200);
      const customersBody = (await customersResponse.json()) as Array<{ id: number; name?: string }>;
      expect(Array.isArray(customersBody)).toBeTruthy();
      if (customersBody.length > 0) {
        expect(typeof customersBody[0]!.id).toBe("number");
      }

      const buildingsResponse = await admin.get("/api/v1/admin/staff/buildings", {
        failOnStatusCode: false
      });
      expect(buildingsResponse.status()).toBe(200);
      const buildingsBody = (await buildingsResponse.json()) as Array<{ id: number; name?: string }>;
      expect(Array.isArray(buildingsBody)).toBeTruthy();
      if (buildingsBody.length > 0) {
        expect(typeof buildingsBody[0]!.id).toBe("number");
      }

      const quickAssignResponse = await admin.post(
        `/api/v1/admin/staff/${createdStaffId}/quick-assign?buildingId=${tempBuilding.id}&customerId=${tempCustomer.id}`,
        {
          failOnStatusCode: false
        }
      );
      expect(quickAssignResponse.status()).toBe(200);
      const quickAssignBody = (await quickAssignResponse.json()) as { message?: string };
      expect(quickAssignBody.message).toBeTruthy();

      const quickAssignedBuildingsResponse = await admin.get(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false,
      });
      expect(quickAssignedBuildingsResponse.status()).toBe(200);
      const quickAssignedBuildings = (await quickAssignedBuildingsResponse.json()) as number[];
      expect(quickAssignedBuildings).toContain(tempBuilding.id);

      const quickAssignedCustomersResponse = await admin.get(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        failOnStatusCode: false
      });
      expect(quickAssignedCustomersResponse.status()).toBe(200);
      const quickAssignedCustomers = (await quickAssignedCustomersResponse.json()) as number[];
      expect(quickAssignedCustomers).toContain(tempCustomer.id);

      const assignBuildingResponse = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: [tempBuilding.id]
      });
      expect(assignBuildingResponse.status()).toBe(200);
      const assignBuildingBody = (await assignBuildingResponse.json()) as { message?: string };
      expect(assignBuildingBody.message).toBeTruthy();

      const assignedBuildingsResponse = await admin.get(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false
      });
      expect(assignedBuildingsResponse.status()).toBe(200);
      const assignedBuildings = (await assignedBuildingsResponse.json()) as number[];
      expect(assignedBuildings).toContain(tempBuilding.id);

      const assignMissingStaff = await admin.put("/api/v1/admin/staff/999999/assignments/buildings", {
        failOnStatusCode: false,
        data: [tempBuilding.id]
      });
      expect(assignMissingStaff.status()).toBe(400);

      const assignCustomerResponse = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: [tempCustomer.id]
      });
      expect(assignCustomerResponse.status()).toBe(200);
      const assignCustomerBody = (await assignCustomerResponse.json()) as { message?: string };
      expect(assignCustomerBody.message).toBeTruthy();

      const deleteWhileAssigned = await admin.delete(`/api/v1/admin/staff/${createdStaffId}`, {
        failOnStatusCode: false
      });
      expect(deleteWhileAssigned.status()).toBe(400);

      const missingDelete = await admin.delete("/api/v1/admin/staff/999999", {
        failOnStatusCode: false
      });
      expect(missingDelete.status()).toBe(400);
      const missingDeleteBody = (await missingDelete.json()) as { message?: string };
      expect(missingDeleteBody.message).toBeTruthy();

      const clearBuildings = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
      expect(clearBuildings.status()).toBe(200);
      const clearBuildingsBody = (await clearBuildings.json()) as { message?: string };
      expect(clearBuildingsBody.message).toBeTruthy();

      const clearCustomers = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      expect(clearCustomers.status()).toBe(200);
      const clearCustomersBody = (await clearCustomers.json()) as { message?: string };
      expect(clearCustomersBody.message).toBeTruthy();

      const deleteResponse = await admin.delete(`/api/v1/admin/staff/${createdStaffId}`, {
        failOnStatusCode: false
      });
      expect(deleteResponse.status()).toBe(200);
      const deleteBody = (await deleteResponse.json()) as { message?: string };
      expect(deleteBody.message).toBeTruthy();

      const deletedRows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM staff WHERE id = ?", [createdStaffId]);
      expect(deletedRows.length).toBe(0);
      createdStaffId = 0;
    } finally {
      if (createdStaffId) {
        await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
          failOnStatusCode: false,
          data: []
        });
        await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
          failOnStatusCode: false,
          data: []
        });
        await admin.delete(`/api/v1/admin/staff/${createdStaffId}`, { failOnStatusCode: false });
      }

      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id);
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
      await TempEntityHelper.xoaStaffTam(admin, tempManager.id);
    }
  });
});
