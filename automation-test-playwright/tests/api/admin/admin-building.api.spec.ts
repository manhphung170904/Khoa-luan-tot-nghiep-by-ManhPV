import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { expectApiErrorBody, expectApiMessage, expectObjectBody, expectPageBody, expectStatusExact } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Admin - API Building @regression", () => {
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
  });

  test.describe("CRUD Building", () => {
    test("[BLD-001] - API Admin Building - Authentication - Create Building Without Login Rejection", async ({ request }) => {
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

    test("[BLD-002] - API Admin Building - Create Building - Required Field Validation", async () => {
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
      expect(errorBody.message).toMatch(/name|tên bất động sản|district|quận|required|bắt buộc/i);
    });

    test("[BLD-012] - API Admin Building - Coordinates - Missing Latitude and Longitude Validation", async () => {
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
      expect(errorBody.message).toMatch(/latitude|longitude|tọa độ|required|bắt buộc/i);
    });

    test("[BLD-013] - API Admin Building - Address Fields - Empty Ward and Street Validation", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, ward: "", street: "" }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/ward|street|phường|đường|bắt buộc|không được để trống/i);
    });

    test("[BLD-014] - API Admin Building - Property Type - Unsupported Value Handling", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, propertyType: "VILLA_LUXURY" }
      });

      expectStatusExact(response, 500, "Unsupported propertyType currently triggers backend 500");
    });

    test("[BLD-003] - API Admin Building - Number of Floor - Negative Value Validation", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, numberOfFloor: -99 }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/floor|tầng|số tầng|>=\s*0|không âm|number/i);
    });

    test("[BLD-018] - API Admin Building - Metadata - Filter Options Schema", async () => {
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

    test("[BLD-006] - API Admin Building - Listing - Property Type Filtering", async () => {
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

    test("[BLD-016] - API Admin Building - Pagination - Invalid Page and Size Handling", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { page: 0, size: 0 }
      });

      expectStatusExact(response, 500, "Invalid pagination currently triggers backend 500");
    });

    test("[BLD-017] - API Admin Building - Search by Name - Empty Result Set", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { name: "XYZNOTEXIST999", page: 1, size: 5 }
      });

      const data = await expectPageBody<{ content: unknown[] }>(response, { status: 200 });
      expect(data.content.length).toBe(0);
    });

    test("[BLD-007] - API Admin Building - Update Building - Nonexistent Building Rejection", async () => {
      const response = await admin.put("/api/v1/admin/buildings/999999999", {
        failOnStatusCode: false,
        data: { ...validPayload, id: null }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/999999999"
      });
      expect(errorBody.message).toMatch(/building|tòa nhà|bất động sản|không tồn tại|không tìm thấy|not found/i);
    });

    test("[BLD-008] - API Admin Building - Update Building - Sold Building Update Restriction", async () => {
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
        expect(errorBody.message).toMatch(/sold|đã bán|sale contract|hợp đồng mua bán/i);

        const rows = await MySqlDbClient.query<{ name: string }>("SELECT name FROM building WHERE id = ?", [tempSaleContract.building.id]);
        expect(rows[0]?.name).toBe(tempSaleContract.building.name);
      } finally {
        await TempEntityHelper.xoaSaleContractTam(admin, tempSaleContract);
      }
    });

    test("[BLD-010] - API Admin Building - Delete Building - Active Contract Deletion Restriction", async () => {
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
        expect(errorBody.message).toMatch(/hợp đồng|liên quan|contract/i);

        const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM building WHERE id = ?", [tempContract.building.id]);
        expect(Number(rows[0]?.count ?? 0)).toBe(1);
      } finally {
        await TempEntityHelper.xoaContractTam(admin, tempContract);
      }
    });

    test("[BLD-019] - API Admin Building - Delete Building - Active Sale Contract Deletion Restriction", async () => {
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

    test("[BLD-015] - API Admin Building - Delete Building - Nonexistent Building Error Handling", async () => {
      const response = await admin.delete("/api/v1/admin/buildings/999999", {
        failOnStatusCode: false
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/999999"
      });
      expect(errorBody.message).toMatch(/building|tòa nhà|bất động sản|không tồn tại|không tìm thấy|not found/i);
    });

    test.describe.serial("Created Building Lifecycle", () => {
      test("[BLD-004] - API Admin Building - Create Building - Successful Creation and Database Persistence", async () => {
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

      test("[BLD-005] - API Admin Building - Listing - Newly Created Building Retrieval", async () => {
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

      test("[BLD-009] - API Admin Building - Update Building - Successful Update and Database Persistence", async () => {
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

      test("[BLD-011] - API Admin Building - Delete Building - Successful Deletion and Database Removal", async () => {
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

  test.describe("Image Upload", () => {
    test("[BLD-U01] - API Admin Building Image - Authentication - Upload Without Login Rejection", async ({ request }) => {
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

    test("[BLD-U06] - API Admin Building Image - File Content - Empty File Validation", async () => {
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
      expect(errorBody.message).toMatch(/file|tệp|ảnh|empty|rỗng|chọn/i);
    });

    test("[BLD-U02] - API Admin Building Image - Media Type - Unsupported Format Validation", async () => {
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
      expect(errorBody.message).toMatch(/image|mime|type|định dạng|tệp|jpg|png|webp|hỗ trợ/i);
    });

    test("[BLD-U07] - API Admin Building Image - File Extension - Mismatched Image Extension Validation", async () => {
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
      expect(errorBody.message).toMatch(/extension|file|jpg|jpeg|định dạng/i);
    });

    test("[BLD-U03] - API Admin Building Image - File Integrity - Corrupted JPG Acceptance Behavior", async () => {
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

    test("[BLD-U04] - API Admin Building Image - File Size - Maximum Size Validation", async () => {
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

    test("[BLD-U05] - API Admin Building Image - Upload - Successful JPG Upload and Generated Filename", async () => {
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




