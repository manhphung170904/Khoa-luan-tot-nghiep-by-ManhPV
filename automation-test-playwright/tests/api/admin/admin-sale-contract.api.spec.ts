import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectLooseApiText, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { TestDbRepository } from "@db/repositories";
import { TempEntityCleanupService } from "@helpers/TempEntityCleanupService";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Admin - API Sale Contract @regression @api", () => {
  const missingId = TestDataFactory.missingId;
  const missingSmallId = TestDataFactory.missingSmallId;

  test("[SC-001] - API Admin Sale Contract - Authentication - Create Sale Contract Without Login Rejection", async ({ request }) => {
    const response = await request.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: TestDataFactory.buildSaleContractPayload()
    });
    await expectApiErrorBody(response, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/sale-contracts"
    });
  });

  test("[SC-002] - API Admin Sale Contract - Sale Price - Zero Value Validation", async ({ adminApi: admin }) => {
    const payload = TestDataFactory.buildSaleContractPayload({ salePrice: 0 });
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: payload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/sale|gi|price|bn/i);

    const rows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND sale_price = ?",
      [payload.buildingId, payload.customerId, payload.salePrice]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-012] - API Admin Sale Contract - Sale Price - Negative Value Validation", async ({ adminApi: admin }) => {
    const payload = TestDataFactory.buildSaleContractPayload({ salePrice: -1 });
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: payload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/sale|gi|price|bn/i);

    const rows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND sale_price = ?",
      [payload.buildingId, payload.customerId, payload.salePrice]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-010] - API Admin Sale Contract - Building Reference - Missing Building Validation", async ({ adminApi: admin }) => {
    const invalidPayload = TestDataFactory.buildSaleContractPayload() as Record<string, unknown>;
    delete invalidPayload.buildingId;
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: invalidPayload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expectLooseApiText(errorBody.message, /building|bat dong san|toa nha|vui long chon/i);
  });

  test("[SC-011] - API Admin Sale Contract - Customer Reference - Missing Customer Validation", async ({ adminApi: admin }) => {
    const invalidPayload = TestDataFactory.buildSaleContractPayload() as Record<string, unknown>;
    delete invalidPayload.customerId;
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: invalidPayload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expectLooseApiText(errorBody.message, /customer|khach hang|vui long chon/i);
  });

  test("[SC-003] - API Admin Sale Contract - Building Reference - Nonexistent Building Validation", async ({ adminApi: admin, cleanupRegistry }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    cleanupRegistry.addLabeled(`Delete customer ${tempCustomer.id}`, () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id));
    cleanupRegistry.addLabeled(`Reset customer assignments for staff ${tempStaff.id}`, () =>
      TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []))
    );

    const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: missingSmallId,
          customerId: tempCustomer.id,
          staffId: tempStaff.id
        })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expectLooseApiText(errorBody.message, /building|toa nha|bat dong san|khong tim thay|not found/i);

    const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [missingSmallId, tempCustomer.id, tempStaff.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-004] - API Admin Sale Contract - Staff Reference - Invalid Staff Validation", async ({ adminApi: admin, cleanupRegistry }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    cleanupRegistry.addLabeled(`Delete building ${tempBuilding.id}`, () => TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id));
    cleanupRegistry.addLabeled(`Delete customer ${tempCustomer.id}`, () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id));
    cleanupRegistry.addLabeled(`Reset building assignments for staff ${tempStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []))
    );
    cleanupRegistry.addLabeled(`Reset customer assignments for staff ${tempStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []))
    );

    const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: -1
        })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/staff|nhn vin|khng tm th?y|not found/i);

    const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, -1]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-013] - API Admin Sale Contract - Staff Assignment - Building Assignment Restriction", async ({ adminApi: admin, cleanupRegistry }) => {
    const assignedManager = await TempEntityHelper.taoStaffTam(admin);
    const outsiderStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, assignedManager.id);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, outsiderStaff.id, [tempCustomer.id]);
    cleanupRegistry.addLabeled(`Delete staff ${assignedManager.id}`, () => TempEntityHelper.xoaStaffTam(admin, assignedManager.id));
    cleanupRegistry.addLabeled(`Delete staff ${outsiderStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, outsiderStaff.id));
    cleanupRegistry.addLabeled(`Delete building ${tempBuilding.id}`, () => TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id));
    cleanupRegistry.addLabeled(`Delete customer ${tempCustomer.id}`, () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id));
    cleanupRegistry.addLabeled(`Reset customer assignments for staff ${outsiderStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongCustomer(admin, outsiderStaff.id, []))
    );

    const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: outsiderStaff.id
        })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/staff|phn cng|building|ta nh/i);

    const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, outsiderStaff.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-014] - API Admin Sale Contract - Staff Assignment - Customer Assignment Restriction", async ({ adminApi: admin, cleanupRegistry }) => {
    const assignedManager = await TempEntityHelper.taoStaffTam(admin);
    const outsiderStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, assignedManager.id);
    await TempEntityHelper.capNhatPhanCongBuilding(admin, outsiderStaff.id, [tempBuilding.id]);
    cleanupRegistry.addLabeled(`Delete staff ${assignedManager.id}`, () => TempEntityHelper.xoaStaffTam(admin, assignedManager.id));
    cleanupRegistry.addLabeled(`Delete staff ${outsiderStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, outsiderStaff.id));
    cleanupRegistry.addLabeled(`Delete building ${tempBuilding.id}`, () => TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id));
    cleanupRegistry.addLabeled(`Delete customer ${tempCustomer.id}`, () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id));
    cleanupRegistry.addLabeled(`Reset building assignments for staff ${outsiderStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongBuilding(admin, outsiderStaff.id, []))
    );

    const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: outsiderStaff.id
        })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/staff|phn cng|customer|khch hng/i);

    const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, outsiderStaff.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-015] - API Admin Sale Contract - Building Type - Rental Building Rejection", async ({ adminApi: admin, cleanupRegistry }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_RENT");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    cleanupRegistry.addLabeled(`Delete building ${tempBuilding.id}`, () => TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id));
    cleanupRegistry.addLabeled(`Delete customer ${tempCustomer.id}`, () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id));
    cleanupRegistry.addLabeled(`Reset building assignments for staff ${tempStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []))
    );
    cleanupRegistry.addLabeled(`Reset customer assignments for staff ${tempStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []))
    );

    const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: tempStaff.id
        })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expectLooseApiText(errorBody.message, /sale|ban|mua ban|transaction|giao dich|khong phai loai mua ban/i);

    const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, tempStaff.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC-016] - API Admin Sale Contract - Duplicate Transaction - Sold Building Sale Restriction", async ({ adminApi: admin, cleanupRegistry }) => {
    const temp = await TempEntityHelper.taoSaleContractTam(admin);
    cleanupRegistry.addLabeled(`Delete sale contract scenario ${temp.id}`, () => TempEntityHelper.xoaSaleContractTam(admin, temp));
    const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: temp.building.id,
          customerId: temp.customer.id,
          staffId: temp.staff.id
        })
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/sale-contracts"
    });
    expectLooseApiText(errorBody.message, /sold|da (duoc )?ban|sale contract|hop dong mua ban/i);

    const rows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ?",
        [temp.building.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[SC-005] - API Admin Sale Contract - Sale Contract Lifecycle - Create List Filter Update and Delete Flow", async ({ adminApi: admin, cleanupRegistry }) => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);
    cleanupRegistry.addLabeled(`Delete staff ${tempStaff.id}`, () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id));
    cleanupRegistry.addLabeled(`Delete building ${tempBuilding.id}`, () => TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id));
    cleanupRegistry.addLabeled(`Delete customer ${tempCustomer.id}`, () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id));
    cleanupRegistry.addLabeled(`Reset building assignments for staff ${tempStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []))
    );
    cleanupRegistry.addLabeled(`Reset customer assignments for staff ${tempStaff.id}`, () =>
    TempEntityCleanupService.safe(() => TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []))
    );

    let createdSaleContractId = 0;

    const payload = TestDataFactory.buildSaleContractPayload({
        buildingId: tempBuilding.id,
        customerId: tempCustomer.id,
        staffId: tempStaff.id,
        transferDate: null
    });

    const createResponse = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: payload
    });
    await expectApiMessage(createResponse, {
        status: 200,
        message: apiExpectedMessages.admin.saleContracts.create,
        dataMode: "null"
    });

    const saleRows = await TestDbRepository.query<{
        id: number;
        sale_price: number;
        note: string;
    }>(
        `
          SELECT id, sale_price, note
          FROM sale_contract
          WHERE customer_id = ? AND building_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [tempCustomer.id, tempBuilding.id]
    );
    expect(saleRows.length).toBe(1);
    createdSaleContractId = saleRows[0]!.id;
    const saleContractIdForCleanup = createdSaleContractId;
    cleanupRegistry.addLabeled(`Delete sale contract ${saleContractIdForCleanup}`, async () => {
        await TestDbRepository.execute("DELETE FROM sale_contract WHERE id = ?", [saleContractIdForCleanup]);
    });
    expect(Number(saleRows[0]!.sale_price)).toBe(Number(payload.salePrice));
    expect(saleRows[0]!.note).toBe(payload.note);

    const listResponse = await admin.get("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        params: { page: 1, size: 100, customerName: tempCustomer.fullName }
    });
    const listBody = await expectPageBody<{
        content?: Array<{
          id: number;
          building?: string;
          customer?: string;
          staff?: string;
          salePrice?: number | string;
        }>;
        totalElements?: number;
    }>(listResponse, { status: 200 });
    const listedItem = listBody.content?.find((item) => item.id === createdSaleContractId);
    expect(listedItem).toBeDefined();
    expect(listedItem?.building).toBe(tempBuilding.name);
    expect(listedItem?.customer).toBe(tempCustomer.fullName);
    expect(listedItem?.staff).toBe(tempStaff.fullName);
    expect(Number(listedItem?.salePrice)).toBe(Number(payload.salePrice));

    const filterResponse = await admin.get("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        params: { buildingId: tempBuilding.id, page: 1, size: 10 }
    });
    const filterBody = await expectPageBody<{
        content?: Array<{ id: number; building?: string }>;
        totalElements?: number;
    }>(filterResponse, { status: 200 });
    const filteredItem = filterBody.content?.find((item) => item.id === createdSaleContractId);
    expect(filteredItem).toBeDefined();
    expect(filteredItem?.building).toBe(tempBuilding.name);

    const updateResponse = await admin.put(`/api/v1/admin/sale-contracts/${createdSaleContractId}`, {
        failOnStatusCode: false,
        data: {
          ...payload,
          id: createdSaleContractId,
          salePrice: 2000,
          transferDate: "2026-06-16",
          note: "Updated note"
        }
    });
    await expectApiMessage(updateResponse, {
        status: 200,
        message: apiExpectedMessages.admin.saleContracts.update,
        dataMode: "null"
    });

    const updatedRows = await TestDbRepository.query<{
        sale_price: number;
        note: string;
        transfer_date: string | null;
    }>(
        "SELECT sale_price, note, DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transfer_date FROM sale_contract WHERE id = ?",
        [createdSaleContractId]
    );

    // Current backend edit flow only persists transferDate; salePrice and note remain unchanged.
    expect(Number(updatedRows[0]!.sale_price)).toBe(Number(payload.salePrice));
    expect(updatedRows[0]!.note).toBe(payload.note);
    expect(updatedRows[0]!.transfer_date).toBe("2026-06-16");

    const deleteResponse = await admin.delete(`/api/v1/admin/sale-contracts/${createdSaleContractId}`, {
        failOnStatusCode: false
    });
    await expectApiMessage(deleteResponse, {
        status: 200,
        message: apiExpectedMessages.admin.saleContracts.delete,
        dataMode: "null"
    });

    const deletedRows = await TestDbRepository.query<{ id: number }>("SELECT id FROM sale_contract WHERE id = ?", [createdSaleContractId]);
    expect(deletedRows.length).toBe(0);
    createdSaleContractId = 0;
  });

  test("[SC-017] - API Admin Sale Contract - Update Sale Contract - Nonexistent ID Rejection", async ({ adminApi: admin }) => {
    const response = await admin.put(`/api/v1/admin/sale-contracts/${missingId}`, {
      failOnStatusCode: false,
      data: TestDataFactory.buildSaleContractPayload({
        buildingId: 1,
        customerId: 1,
        staffId: 1,
        transferDate: "2026-06-16"
      })
    });

    const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/sale-contracts/${missingId}`
    });
    expectLooseApiText(errorBody.message, /sale contract|hop dong mua ban|khong tim thay|khong ton tai|not found/i);
  });

  test("[SC-018] - API Admin Sale Contract - Delete Sale Contract - Nonexistent ID Rejection", async ({ adminApi: admin }) => {
    const response = await admin.delete(`/api/v1/admin/sale-contracts/${missingId}`, {
      failOnStatusCode: false
    });

    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/sale-contracts/${missingId}`
    });
  });
});
