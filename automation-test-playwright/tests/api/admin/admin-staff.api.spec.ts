import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectArrayBody, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Admin - API Staff @regression", () => {
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
  });

  test("[STF-001] - API Admin Staff - Authentication - Create Staff Without Login Rejection", async ({ request }) => {
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

  test("[STF-002] - API Admin Staff - Username - Minimum Length Validation", async () => {
    const shortUsername = "abc";
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ username: shortUsername })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
    expect(errorBody.message).toMatch(/username|đăng nhập|ít nhất|min/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM staff WHERE username = ?", [shortUsername]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[STF-017] - API Admin Staff - Password - Minimum Length Validation", async () => {
    const username = TestDataFactory.taoUsername("stfpwd");
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ username, password: "12345" })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
    expect(errorBody.message).toMatch(/password|mật khẩu|ít nhất|min/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM staff WHERE username = ?", [username]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[STF-003] - API Admin Staff - Phone Number - Invalid Format Validation", async () => {
    const invalidPhone = "1987654321";
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ phone: invalidPhone })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
    expect(errorBody.message).toMatch(/phone|điện thoại|không hợp lệ|invalid/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM staff WHERE phone = ?", [invalidPhone]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[STF-018] - API Admin Staff - Full Name - Maximum Length Validation", async () => {
    const oversizeName = "A".repeat(101);
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ fullName: oversizeName })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
    expect(errorBody.message).toMatch(/full.?name|họ tên|tối đa|max|ký tự/i);
  });

  test("[STF-015] - API Admin Staff - Username - Minimum Length Boundary Acceptance", async () => {
    const username = TestDataFactory.taoUsername("ab").slice(0, 4);
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

    const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM staff WHERE username = ? LIMIT 1", [username]);
    expect(rows[0]?.id).toBeTruthy();
    await admin.delete(`/api/v1/admin/staff/${rows[0]!.id}`, { failOnStatusCode: false });
  });

  test("[STF-016] - API Admin Staff - Username - Maximum Length Validation", async () => {
    const longUsername = "a".repeat(31);
    const response = await admin.post("/api/v1/admin/staff", {
      failOnStatusCode: false,
      data: TestDataFactory.buildAdminStaffPayload({ username: longUsername })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/staff"
    });
    expect(errorBody.message).toMatch(/username|đăng nhập|tối đa|max|độ dài/i);

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM staff WHERE username = ?", [longUsername]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[STF-019] - API Admin Staff - Building Assignment - Active Contract Removal Restriction", async () => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.put(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/staff/${tempContract.staff.id}/assignments/buildings`
      });
      expect(errorBody.message).toMatch(/building|tòa nhà|contract|hợp đồng|phân công/i);

      const assignmentsResponse = await admin.get(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/buildings`, {
        failOnStatusCode: false
      });
      const assignments = await expectArrayBody<number>(assignmentsResponse, 200);
      expect(assignments).toContain(tempContract.building.id);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });

  test("[STF-020] - API Admin Staff - Customer Assignment - Active Contract Removal Restriction", async () => {
    const tempContract = await TempEntityHelper.taoContractTam(admin);
    try {
      const response = await admin.put(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/staff/${tempContract.staff.id}/assignments/customers`
      });
      expect(errorBody.message).toMatch(/customer|khách hàng|contract|hợp đồng|phân công/i);

      const assignmentsResponse = await admin.get(`/api/v1/admin/staff/${tempContract.staff.id}/assignments/customers`, {
        failOnStatusCode: false
      });
      const assignments = await expectArrayBody<number>(assignmentsResponse, 200);
      expect(assignments).toContain(tempContract.customer.id);
    } finally {
      await TempEntityHelper.xoaContractTam(admin, tempContract);
    }
  });

  test("[STF-004] - API Admin Staff - Staff Lifecycle - Create and Full Assignment Flow", async () => {
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
      const duplicateUsernameError = await expectApiErrorBody<{ message?: string }>(duplicateUsername, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff"
      });
      expect(duplicateUsernameError.message).toMatch(/username|tên đăng nhập|đăng nhập|tồn tại|trùng/i);
      const duplicateUsernameRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM staff WHERE username = ?",
        [String(payload.username)]
      );
      expect(Number(duplicateUsernameRows[0]?.count ?? 0)).toBe(1);

      const duplicateEmail = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: TestDataFactory.buildAdminStaffPayload({
          email: payload.email,
          phone: TestDataFactory.taoSoDienThoai()
        })
      });
      const duplicateEmailError = await expectApiErrorBody<{ message?: string }>(duplicateEmail, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff"
      });
      expect(duplicateEmailError.message).toMatch(/email|tồn tại|trùng/i);
      const duplicateEmailRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM staff WHERE email = ?",
        [String(payload.email)]
      );
      expect(Number(duplicateEmailRows[0]?.count ?? 0)).toBe(1);

      const duplicatePhone = await admin.post("/api/v1/admin/staff", {
        failOnStatusCode: false,
        data: TestDataFactory.buildAdminStaffPayload({
          email: TestDataFactory.taoEmail("pw-staff-dup-phone"),
          phone: payload.phone
        })
      });
      const duplicatePhoneError = await expectApiErrorBody<{ message?: string }>(duplicatePhone, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff"
      });
      expect(duplicatePhoneError.message).toMatch(/phone|điện thoại|tồn tại|trùng/i);
      const duplicatePhoneRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM staff WHERE phone = ?",
        [String(payload.phone)]
      );
      expect(Number(duplicatePhoneRows[0]?.count ?? 0)).toBe(1);

      const listResponse = await admin.get("/api/v1/admin/staff", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, role: "STAFF", fullName: String(payload.fullName) }
      });
      const listBody = await expectPageBody<{
        content?: Array<{ id: number; fullName?: string; email?: string; role?: string }>;
        totalElements?: number;
      }>(listResponse, { status: 200 });
      expect(listBody.content?.some((item) => item.id === createdStaffId)).toBeTruthy();
      const createdItem = listBody.content?.find((item) => item.id === createdStaffId || item.email === payload.email);
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
        failOnStatusCode: false
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
      const assignMissingStaffError = await expectApiErrorBody<{ message?: string }>(assignMissingStaff, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff/999999/assignments/buildings"
      });
      expect(assignMissingStaffError.message).toMatch(/staff|nhân viên|không tồn tại|không tìm thấy|not found/i);

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
      const deleteWhileAssignedError = await expectApiErrorBody<{ message?: string }>(deleteWhileAssigned, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/staff/${createdStaffId}`
      });
      expect(deleteWhileAssignedError.message).toMatch(/assignment|phân công|contract|hợp đồng|bất động sản/i);

      const stillExistsRows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM staff WHERE id = ?", [createdStaffId]);
      expect(Number(stillExistsRows[0]?.count ?? 0)).toBe(1);

      const missingDelete = await admin.delete("/api/v1/admin/staff/999999", {
        failOnStatusCode: false
      });
      const missingDeleteError = await expectApiErrorBody<{ message?: string }>(missingDelete, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/staff/999999"
      });
      expect(missingDeleteError.message).toMatch(/staff|nhân viên|không tồn tại|không tìm thấy|not found/i);

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
