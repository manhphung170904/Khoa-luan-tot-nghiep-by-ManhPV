import { expect, test, type APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectArrayBody, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
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
    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/staff"
    });
  });

  test("[STF_002] POST /staff rejects username shorter than 4", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ username: "abc" })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
  });

  test("[STF_017] POST /staff rejects password shorter than 6", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ password: "12345" })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
  });

  test("[STF_003] POST /staff rejects invalid phone format", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ phone: "1987654321" })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
  });

  test("[STF_018] POST /staff rejects fullName longer than 100 chars", async () => {
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ fullName: "A".repeat(101) })
    });
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
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
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.staff.create,
      dataMode: "null"
    });

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
    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
  });

  test("[STF_019] PUT /staff/{id}/assignments/buildings blocks removing active-contract building", async () => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.put(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/staff/${tempContract.staff.id}/assignments/buildings`
      });
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
      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/staff/${tempContract.staff.id}/assignments/customers`
      });
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
      await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.staff.create,
        dataMode: "null"
      });

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
      await expectApiErrorBody(duplicateUsername, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff"
      });

      const duplicateEmail = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: TestDataFactory.buildAdminStaffPayload({
          email: payload.email,
          phone: TestDataFactory.taoSoDienThoai()
        })
      });
      await expectApiErrorBody(duplicateEmail, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff"
      });

      const duplicatePhone = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: TestDataFactory.buildAdminStaffPayload({
          email: TestDataFactory.taoEmail("pw-staff-dup-phone"),
          phone: payload.phone
        })
      });
      await expectApiErrorBody(duplicatePhone, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff"
      });

      const listResponse = await admin.get("/api/v1/admin/staff", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, role: "STAFF" }
      });
      const listBody = await expectPageBody<{
        content?: Array<{ id: number; fullName?: string; email?: string; role?: string }>;
        totalElements?: number;
      }>(listResponse, { status: 200 });
      expect(listBody.content?.some((item) => item.id === createdStaffId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdStaffId);
      expect(createdItem?.fullName).toBe(payload.fullName);
      expect(createdItem?.email).toBe(payload.email);
      expect(createdItem?.role).toBe("STAFF");

      const customersResponse = await admin.get("/api/v1/admin/staff/customers", {
        failOnStatusCode: false
      });
      const customersBody = await expectArrayBody<Array<{ id: number; name?: string }>[number]>(customersResponse, 200);
      if (customersBody.length > 0) {
        expect(typeof customersBody[0]!.id).toBe("number");
      }

      const buildingsResponse = await admin.get("/api/v1/admin/staff/buildings", {
        failOnStatusCode: false
      });
      const buildingsBody = await expectArrayBody<Array<{ id: number; name?: string }>[number]>(buildingsResponse, 200);
      if (buildingsBody.length > 0) {
        expect(typeof buildingsBody[0]!.id).toBe("number");
      }

      const quickAssignResponse = await admin.post(
        `/api/v1/admin/staff/${createdStaffId}/quick-assign?buildingId=${tempBuilding.id}&customerId=${tempCustomer.id}`,
        {
          failOnStatusCode: false
        }
      );
      await expectApiMessage(quickAssignResponse, {
        status: 200,
        message: apiExpectedMessages.admin.staff.quickAssign,
        dataMode: "null"
      });

      const quickAssignedBuildingsResponse = await admin.get(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false,
      });
      const quickAssignedBuildings = await expectArrayBody<number>(quickAssignedBuildingsResponse, 200);
      expect(quickAssignedBuildings).toContain(tempBuilding.id);

      const quickAssignedCustomersResponse = await admin.get(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        failOnStatusCode: false
      });
      const quickAssignedCustomers = await expectArrayBody<number>(quickAssignedCustomersResponse, 200);
      expect(quickAssignedCustomers).toContain(tempCustomer.id);

      const assignBuildingResponse = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: [tempBuilding.id]
      });
      await expectApiMessage(assignBuildingResponse, {
        status: 200,
        message: apiExpectedMessages.admin.staff.updateBuildingAssignments,
        dataMode: "null"
      });

      const assignedBuildingsResponse = await admin.get(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false
      });
      const assignedBuildings = await expectArrayBody<number>(assignedBuildingsResponse, 200);
      expect(assignedBuildings).toContain(tempBuilding.id);

      const assignMissingStaff = await admin.put("/api/v1/admin/staff/999999/assignments/buildings", {
        failOnStatusCode: false,
        data: [tempBuilding.id]
      });
      await expectApiErrorBody(assignMissingStaff, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff/999999/assignments/buildings"
      });

      const assignCustomerResponse = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: [tempCustomer.id]
      });
      await expectApiMessage(assignCustomerResponse, {
        status: 200,
        message: apiExpectedMessages.admin.staff.updateCustomerAssignments,
        dataMode: "null"
      });

      const deleteWhileAssigned = await admin.delete(`/api/v1/admin/staff/${createdStaffId}`, {
        failOnStatusCode: false
      });
      await expectApiErrorBody(deleteWhileAssigned, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/staff/${createdStaffId}`
      });

      const missingDelete = await admin.delete("/api/v1/admin/staff/999999", {
        failOnStatusCode: false
      });
      await expectApiErrorBody(missingDelete, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff/999999"
      });

      const clearBuildings = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
      await expectApiMessage(clearBuildings, {
        status: 200,
        message: apiExpectedMessages.admin.staff.updateBuildingAssignments,
        dataMode: "null"
      });

      const clearCustomers = await admin.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      await expectApiMessage(clearCustomers, {
        status: 200,
        message: apiExpectedMessages.admin.staff.updateCustomerAssignments,
        dataMode: "null"
      });

      const deleteResponse = await admin.delete(`/api/v1/admin/staff/${createdStaffId}`, {
        failOnStatusCode: false
      });
      await expectApiMessage(deleteResponse, {
        status: 200,
        message: apiExpectedMessages.admin.staff.delete,
        dataMode: "null"
      });

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
