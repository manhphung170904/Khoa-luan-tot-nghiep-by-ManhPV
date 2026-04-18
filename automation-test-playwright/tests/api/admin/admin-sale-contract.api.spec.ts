import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin Sale Contract API Tests @api @regression", () => {
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
    await MySqlDbClient.close();
  });

  test("[SC_001] POST /sale-contracts rejects anonymous create", async ({ request }) => {
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

  test("[SC_002] POST /sale-contracts rejects zero salePrice", async () => {
    const payload = TestDataFactory.buildSaleContractPayload({ salePrice: 0 });
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: payload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/sale|giá|gia|price|bán|ban/i);

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND sale_price = ?",
      [payload.buildingId, payload.customerId, payload.salePrice]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC_012] POST /sale-contracts rejects negative salePrice", async () => {
    const payload = TestDataFactory.buildSaleContractPayload({ salePrice: -1 });
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: payload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/sale|giá|gia|price|bán|ban/i);

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND sale_price = ?",
      [payload.buildingId, payload.customerId, payload.salePrice]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[SC_010] POST /sale-contracts rejects missing buildingId", async () => {
    const invalidPayload = TestDataFactory.buildSaleContractPayload() as Record<string, unknown>;
    delete invalidPayload.buildingId;
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: invalidPayload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/building|bất động sản|bat dong san|tòa nhà|toa nha|vui lòng chọn|vui long chon/i);
  });

  test("[SC_011] POST /sale-contracts rejects missing customerId", async () => {
    const invalidPayload = TestDataFactory.buildSaleContractPayload() as Record<string, unknown>;
    delete invalidPayload.customerId;
    const response = await admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: invalidPayload
    });
    const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
    expect(errorBody.message).toMatch(/customer|khách hàng|khach hang|vui lòng chọn|vui long chon/i);
  });

  test("[SC_003] POST /sale-contracts rejects nonexistent buildingId", async () => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);

    try {
      const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: 999999,
          customerId: tempCustomer.id,
          staffId: tempStaff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
      expect(errorBody.message).toMatch(/building|toa nha|bất động sản|bat dong san|khong tim thay|không tìm thấy|not found/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [999999, tempCustomer.id, tempStaff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []).catch(() => {});
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id).catch(() => {});
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id).catch(() => {});
    }
  });

  test("[SC_004] POST /sale-contracts rejects invalid staffId", async () => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);

    try {
      const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: -1
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
      expect(errorBody.message).toMatch(/staff|nhan vien|nhân viên|khong tim thay|không tìm thấy|not found/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, -1]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []).catch(() => {});
      await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []).catch(() => {});
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id).catch(() => {});
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id).catch(() => {});
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id).catch(() => {});
    }
  });

  test("[SC_013] POST /sale-contracts rejects staff outside building assignment", async () => {
    const assignedManager = await TempEntityHelper.taoStaffTam(admin);
    const outsiderStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, assignedManager.id);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, outsiderStaff.id, [tempCustomer.id]);

    try {
      const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: outsiderStaff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
      expect(errorBody.message).toMatch(/staff|phan cong|building|toa nha/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, outsiderStaff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.capNhatPhanCongCustomer(admin, outsiderStaff.id, []);
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id);
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
      await TempEntityHelper.xoaStaffTam(admin, outsiderStaff.id);
      await TempEntityHelper.xoaStaffTam(admin, assignedManager.id);
    }
  });

  test("[SC_014] POST /sale-contracts rejects staff outside customer assignment", async () => {
    const assignedManager = await TempEntityHelper.taoStaffTam(admin);
    const outsiderStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, assignedManager.id);
    await TempEntityHelper.capNhatPhanCongBuilding(admin, outsiderStaff.id, [tempBuilding.id]);

    try {
      const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: outsiderStaff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
      expect(errorBody.message).toMatch(/staff|phan cong|customer|khach hang/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, outsiderStaff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.capNhatPhanCongBuilding(admin, outsiderStaff.id, []);
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id);
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
      await TempEntityHelper.xoaStaffTam(admin, outsiderStaff.id);
      await TempEntityHelper.xoaStaffTam(admin, assignedManager.id);
    }
  });

  test("[SC_015] POST /sale-contracts rejects rent building", async () => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_RENT");
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);

    try {
      const response = await admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: tempBuilding.id,
          customerId: tempCustomer.id,
          staffId: tempStaff.id
        })
      });
      const errorBody = await expectApiErrorBody<{ message?: string }>(response, { status: 400, code: "BAD_REQUEST", path: "/api/v1/admin/sale-contracts" });
      expect(errorBody.message).toMatch(/sale|ban|mua ban|mua bán|transaction|giao dich|giao dịch|khong phai loai mua ban|không phải loại mua bán/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ? AND customer_id = ? AND staff_id = ?",
        [tempBuilding.id, tempCustomer.id, tempStaff.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []);
      await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []);
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id);
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
    }
  });

  test("[SC_016] POST /sale-contracts rejects duplicate sale on sold building", async () => {
    const temp = await TempEntityHelper.taoSaleContractTam(admin);
    try {
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
      expect(errorBody.message).toMatch(/sold|đã( được)? bán|da ban|sale contract|hợp đồng mua bán|hop dong mua ban/i);

      const rows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sale_contract WHERE building_id = ?",
        [temp.building.id]
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(1);
    } finally {
      await TempEntityHelper.xoaSaleContractTam(admin, temp);
    }
  });

  test("[SC_005] sale contract create/list/filter/update-delete lifecycle with temp data", async () => {
    const tempStaff = await TempEntityHelper.taoStaffTam(admin);
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_SALE");
    await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
    const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
    await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);

    let createdSaleContractId = 0;

    try {
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

      const saleRows = await MySqlDbClient.query<{
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

      const updatedRows = await MySqlDbClient.query<{
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

      const deletedRows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM sale_contract WHERE id = ?", [createdSaleContractId]);
      expect(deletedRows.length).toBe(0);
      createdSaleContractId = 0;
    } finally {
      if (createdSaleContractId) {
        await admin.delete(`/api/v1/admin/sale-contracts/${createdSaleContractId}`, { failOnStatusCode: false });
      }
      await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []);
      await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []);
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id);
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
    }
  });

  test("[SC_017] PUT /sale-contracts/{id} rejects nonexistent id", async () => {
    const response = await admin.put("/api/v1/admin/sale-contracts/999999999", {
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
      path: "/api/v1/admin/sale-contracts/999999999"
    });
    expect(errorBody.message).toMatch(
      /sale contract|hợp đồng mua bán|hop dong mua ban|không tìm thấy|khong tim thay|khong ton tai|not found/i
    );
  });

  test("[SC_018] DELETE /sale-contracts/{id} should reject nonexistent id", async () => {
    test.fail(true, "Known defect: delete nonexistent sale contract is not guarded explicitly by the service.");

    const response = await admin.delete("/api/v1/admin/sale-contracts/999999999", {
      failOnStatusCode: false
    });

    await expectApiErrorBody(response, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/sale-contracts/999999999"
    });
  });
});


