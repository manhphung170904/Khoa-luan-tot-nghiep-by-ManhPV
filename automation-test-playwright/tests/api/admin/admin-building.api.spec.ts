import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectObjectBody, expectPageBody, expectStatusExact } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Admin - kiem thu API quan ly building @regression", () => {
  let admin: APIRequestContext;
  let createdBuildingId = 0;
  let createdBuildingName = "";

  const validPayload = TestDataFactory.buildBuildingPayload({
    districtId: 1,
    numberOfFloor: 10,
    numberOfBasement: 2,
    floorArea: 500,
    ward: "Auto Ward",
    street: "Auto Street",
    propertyType: "OFFICE",
    transactionType: "FOR_RENT",
    rentPrice: 25,
    latitude: 10.762622,
    longitude: 106.660172,
    staffIds: []
  }) as Record<string, unknown>;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    if (createdBuildingId) {
      await admin.delete(`/api/v1/admin/buildings/${createdBuildingId}`, {
        failOnStatusCode: false
      });
    }

    await admin.dispose();
    await MySqlDbClient.close();
  });

  test.describe("CRUD building", () => {
    test("[BLD_001] POST /buildings tu choi tao moi khi chua dang nhap", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: validPayload
      });
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/admin/buildings"
      });
    });

    test("[BLD_002] POST /buildings tu choi khi thieu truong bat buoc", async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.name;
      delete invalidPayload.districtId;

      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: invalidPayload
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/name|tên bất động sản|ten bat dong san|district|quận|quan|required|bắt buộc|bat buoc/i);
    });

    test("[BLD_012] POST /buildings tu choi khi thieu latitude va longitude", async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.latitude;
      delete invalidPayload.longitude;

      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: invalidPayload
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/latitude|longitude|tọa độ|toa do|required|bắt buộc|bat buoc/i);
    });

    test("[BLD_013] POST /buildings tu choi khi ward va street de trong", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, ward: "", street: "" }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/ward|street|phường|phuong|đường|duong|bắt buộc|bat buoc|không được để trống|khong duoc de trong/i);
    });

    test("[BLD_014] POST /buildings loi khi propertyType khong duoc ho tro", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, propertyType: "VILLA_LUXURY" }
      });

      expectStatusExact(response, 500, "Unsupported propertyType currently triggers backend 500");
    });

    test("[BLD_003] POST /buildings tu choi numberOfFloor am", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, numberOfFloor: -99 }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/floor|tang|so tang|số tầng|>=\s*0|khong am|không âm|number/i);
    });

    test("[BLD_018] GET /buildings/metadata tra ve dung cau truc bo loc", async () => {
      const response = await admin.get("/api/v1/admin/buildings/metadata", {
        failOnStatusCode: false
      });

      const data = await expectObjectBody<{
        propertyTypes?: unknown[];
        transactionTypes?: unknown[];
        directions?: unknown[];
        levels?: unknown[];
        managers?: unknown[];
      }>(response, 200, ["propertyTypes", "transactionTypes", "directions", "levels", "managers"]);
      expect(Array.isArray(data.propertyTypes)).toBeTruthy();
      expect(Array.isArray(data.transactionTypes)).toBeTruthy();
      expect(Array.isArray(data.directions)).toBeTruthy();
      expect(Array.isArray(data.levels)).toBeTruthy();
      expect(Array.isArray(data.managers)).toBeTruthy();
    });

    test("[BLD_006] GET /buildings loc theo propertyType", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { propertyType: "OFFICE", page: 1, size: 100 }
      });

      const data = await expectPageBody<{
        content: Array<{ id?: number; name?: string }>;
        totalElements?: number;
      }>(response, { status: 200 });
      expect(data.content.length).toBeGreaterThan(0);
      expect(data.content.every((item) => typeof item.id === "number" && typeof item.name === "string")).toBeTruthy();
    });

    test("[BLD_016] GET /buildings loi voi page=0 va size=0", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { page: 0, size: 0 }
      });

      expectStatusExact(response, 500, "Invalid pagination currently triggers backend 500");
    });

    test("[BLD_017] GET /buildings tra ve danh sach rong voi ten khong ton tai", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { name: "XYZNOTEXIST999", page: 1, size: 5 }
      });

      const data = await expectPageBody<{ content: unknown[] }>(response, { status: 200 });
      expect(data.content.length).toBe(0);
    });

    test("[BLD_007] PUT /buildings/{id} tu choi cap nhat cho building khong ton tai", async () => {
      const response = await admin.put("/api/v1/admin/buildings/999999999", {
        failOnStatusCode: false,
        data: { ...validPayload, id: null }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/999999999"
      });
      expect(errorBody.message).toMatch(/building|toa nha|bat dong san|bất động sản|khong ton tai|không tồn tại|khong tim thay|không tìm thấy|not found/i);
    });

    test("[BLD_008] PUT /buildings/{id} chan cap nhat building da ban voi du lieu sale contract tam", async () => {
      const tempSaleContract = await TempEntityHelper.taoSaleContractTam(admin);

      try {
        const response = await admin.put(`/api/v1/admin/buildings/${tempSaleContract.building.id}`, {
          failOnStatusCode: false,
          data: TestDataFactory.buildBuildingPayload(
            {
              id: tempSaleContract.building.id,
              name: tempSaleContract.building.name,
              salePrice: 4500000000,
              rentPrice: null,
              deposit: null,
              serviceFee: null,
              carFee: null,
              motorbikeFee: null,
              waterFee: null,
              electricityFee: null
            },
            "FOR_SALE"
          )
        });

        const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
          status: 400,
          code: "BAD_REQUEST",
          path: `/api/v1/admin/buildings/${tempSaleContract.building.id}`
        });
        expect(errorBody.message).toMatch(/sold|đã bán|da ban|sale contract|hợp đồng mua bán|hop dong mua ban/i);

        const rows = await MySqlDbClient.query<{ name: string }>("SELECT name FROM building WHERE id = ?", [tempSaleContract.building.id]);
        expect(rows[0]?.name).toBe(tempSaleContract.building.name);
      } finally {
        await TempEntityHelper.xoaSaleContractTam(admin, tempSaleContract);
      }
    });

    test("[BLD_010] DELETE /buildings/{id} phai chan xoa khi dang co contract du lieu tam", async () => {
      const tempContract = await TempEntityHelper.taoContractTam(admin);

      try {
        const response = await admin.delete(`/api/v1/admin/buildings/${tempContract.building.id}`, {
          failOnStatusCode: false
        });

        const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
          status: 400,
          code: "BAD_REQUEST",
          path: `/api/v1/admin/buildings/${tempContract.building.id}`
        });
        expect(errorBody.message).toMatch(/hợp đồng|hop dong|liên quan|lien quan|contract/i);

        const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM building WHERE id = ?", [tempContract.building.id]);
        expect(Number(rows[0]?.count ?? 0)).toBe(1);
      } finally {
        await TempEntityHelper.xoaContractTam(admin, tempContract);
      }
    });

    test("[BLD_019] DELETE /buildings/{id} phai chan xoa khi dang co sale contract du lieu tam", async () => {
      const tempSaleContract = await TempEntityHelper.taoSaleContractTam(admin);

      try {
        const response = await admin.delete(`/api/v1/admin/buildings/${tempSaleContract.building.id}`, {
          failOnStatusCode: false
        });

        await expectApiErrorBody(response, {
          status: 400,
          code: "BAD_REQUEST",
          path: `/api/v1/admin/buildings/${tempSaleContract.building.id}`
        });
      } finally {
        await MySqlDbClient.execute("DELETE FROM sale_contract WHERE id = ?", [tempSaleContract.id]).catch(() => {});
        await TempEntityHelper.capNhatPhanCongCustomer(admin, tempSaleContract.staff.id, []).catch(() => {});
        await TempEntityHelper.capNhatPhanCongBuilding(admin, tempSaleContract.staff.id, []).catch(() => {});
        await TempEntityHelper.xoaCustomerTam(admin, tempSaleContract.customer.id).catch(() => {});
        await TempEntityHelper.xoaBuildingTam(admin, tempSaleContract.building.id).catch(() => {});
        await TempEntityHelper.xoaStaffTam(admin, tempSaleContract.staff.id).catch(() => {});
      }
    });

    test("[BLD_015] DELETE /buildings/{id} tra ve loi khong tim thay voi id khong ton tai", async () => {
      const response = await admin.delete("/api/v1/admin/buildings/999999", {
        failOnStatusCode: false
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/999999"
      });
      expect(errorBody.message).toMatch(/building|toa nha|bat dong san|bất động sản|khong ton tai|không tồn tại|khong tim thay|không tìm thấy|not found/i);
    });

    test.describe.serial("Vong doi building duoc tao", () => {
      test("[BLD_004] POST /buildings tao building va luu vao DB", async () => {
        const payload = {
          ...validPayload,
          name: TestDataFactory.taoTenToaNha("Auto Test Building")
        } as Record<string, unknown>;

        const response = await admin.post("/api/v1/admin/buildings", {
          failOnStatusCode: false,
          data: payload
        });

        await expectApiMessage(response, {
          status: 200,
          message: apiExpectedMessages.admin.buildings.create,
          dataMode: "null"
        });

        const dbResult = await MySqlDbClient.query<{
          id: number;
          number_of_floor: number;
          number_of_basement: number;
          floor_area: number;
          street: string;
          ward: string;
          property_type: string;
          transaction_type: string;
        }>(
          "SELECT * FROM building WHERE name = ? ORDER BY id DESC LIMIT 1",
          [String(payload.name)]
        );
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]!.number_of_floor).toBe(payload.numberOfFloor);
        expect(dbResult[0]!.number_of_basement).toBe(payload.numberOfBasement);
        expect(Number(dbResult[0]!.floor_area)).toBe(payload.floorArea);
        expect(dbResult[0]!.street).toBe(payload.street);
        expect(dbResult[0]!.ward).toBe(payload.ward);
        expect(dbResult[0]!.property_type).toBe(payload.propertyType);
        expect(dbResult[0]!.transaction_type).toBe(payload.transactionType);

        createdBuildingId = dbResult[0]!.id;
        createdBuildingName = String(payload.name);
      });

      test("[BLD_005] GET /buildings liet ke building vua tao", async () => {
        const response = await admin.get("/api/v1/admin/buildings", {
          failOnStatusCode: false,
          params: { page: 1, size: 100, name: createdBuildingName }
        });

        const data = await expectPageBody<{
          content: Array<{ id: number; name: string }>;
          totalElements?: number;
        }>(response, { status: 200 });
        const found = data.content.find((building) => building.id === createdBuildingId);
        expect(found).toBeDefined();
        expect(found?.name).toBe(createdBuildingName);
      });

      test("[BLD_009] PUT /buildings/{id} cap nhat building vua tao va DB", async () => {
        const updatedName = `${createdBuildingName} - UPDATED`;
        const response = await admin.put(`/api/v1/admin/buildings/${createdBuildingId}`, {
          failOnStatusCode: false,
          data: {
            ...validPayload,
            id: createdBuildingId,
            name: updatedName,
            floorArea: 999
          }
        });

        await expectApiMessage(response, {
          status: 200,
          message: apiExpectedMessages.admin.buildings.update,
          dataMode: "null"
        });

        const dbResult = await MySqlDbClient.query<{ name: string; floor_area: number }>(
          "SELECT name, floor_area FROM building WHERE id = ?",
          [createdBuildingId]
        );
        expect(dbResult[0]!.name).toContain("UPDATED");
        expect(Number(dbResult[0]!.floor_area)).toBe(999);
        createdBuildingName = updatedName;
      });

      test("[BLD_011] DELETE /buildings/{id} xoa building vua tao", async () => {
        const response = await admin.delete(`/api/v1/admin/buildings/${createdBuildingId}`, {
          failOnStatusCode: false
        });

        await expectApiMessage(response, {
          status: 200,
          message: apiExpectedMessages.admin.buildings.delete,
          dataMode: "null"
        });

        const dbResult = await MySqlDbClient.query<{ id: number }>(
          "SELECT id FROM building WHERE id = ?",
          [createdBuildingId]
        );
        expect(dbResult.length).toBe(0);

        createdBuildingId = 0;
        createdBuildingName = "";
      });
    });
  });

  test.describe("Upload image", () => {
    test("[BLD_U01] POST /buildings/image tu choi upload khi chua dang nhap", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: ApiFileFixtures.buildingJpg()
        }
      });

      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/admin/buildings/image"
      });
    });

    test("[BLD_U06] POST /buildings/image tu choi file rong", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: { name: "empty.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) }
        }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
      expect(errorBody.message).toMatch(/file|tep|tệp|anh|ảnh|empty|rong|rỗng|chon|chọn/i);
    });

    test("[BLD_U02] POST /buildings/image tu choi media type khong duoc ho tro", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: ApiFileFixtures.invalidText()
        }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
      expect(errorBody.message).toMatch(/image|mime|type|dinh dang|tệp|tep|jpg|png|webp|hỗ trợ|ho tro/i);
    });

    test("[BLD_U07] POST /buildings/image tu choi duoi file khong hop le du media type la image", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: { name: "image.gif", mimeType: "image/jpeg", buffer: Buffer.from("fake gif data") }
        }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
      expect(errorBody.message).toMatch(/extension|file|jpg|jpeg|dinh dang/i);
    });

    test("[BLD_U03] POST /buildings/image hien tai van chap nhan JPG hong neu media type va duoi hop le", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: ApiFileFixtures.corruptJpg()
        }
      });

      const data = await expectApiMessage<{ message?: string; data?: { filename?: string } }>(response, {
        status: 200,
        message: apiExpectedMessages.admin.buildings.upload,
        dataMode: "object"
      });
      expect(data.data?.filename).toMatch(/\.jpg$/);
    });

    test("[BLD_U04] POST /buildings/image tu choi file lon hon 5MB", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: { name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(5 * 1024 * 1024 + 16, "0") }
        }
      });

      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
    });

    test("[BLD_U05] POST /buildings/image upload JPG hop le va tra ve ten file duoc tao", async () => {
      const sourceFile = ApiFileFixtures.buildingJpg();
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: sourceFile
        }
      });

      const data = await expectApiMessage<{ message?: string; data?: { filename?: string } }>(response, {
        status: 200,
        message: apiExpectedMessages.admin.buildings.upload,
        dataMode: "object"
      });
      expect(data.data?.filename).toBeDefined();
      expect(data.data?.filename).not.toBe(sourceFile.name);
      expect(data.data?.filename).toMatch(/\.jpg$/);
    });
  });
});



