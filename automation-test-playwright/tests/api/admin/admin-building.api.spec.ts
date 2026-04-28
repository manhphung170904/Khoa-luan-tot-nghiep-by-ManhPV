import { expect, test } from "@fixtures/api.fixture";
import { env } from "@config/env";
import { expectApiErrorBody, expectApiMessage, expectLooseApiText, expectObjectBody, expectPageBody, expectStatusExact } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { cleanupUploadedFileByName } from "@helpers/UploadedFileCleanupHelper";

test.describe("Admin - API Building @regression @api", () => {
  const missingId = TestDataFactory.missingId;
  const missingSmallId = TestDataFactory.missingSmallId;

  const validPayload = TestDataFactory.buildBuildingPayload({
    districtId: env.testDataSeed.districtId,
    numberOfFloor: 10,
    numberOfBasement: 2,
    floorArea: 500,
    ward: env.testDataSeed.ward,
    street: env.testDataSeed.street,
    propertyType: "OFFICE",
    transactionType: "FOR_RENT",
    rentPrice: 25,
    latitude: env.testDataSeed.latitude,
    longitude: env.testDataSeed.longitude,
    staffIds: []
  }) as Record<string, unknown>;

  test.describe("CRUD Building @api", () => {
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

    test("[BLD-002] - API Admin Building - Create Building - Required Field Validation", async ({ adminBuildingApi }) => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.name;
      delete invalidPayload.districtId;

      const response = await adminBuildingApi.create(invalidPayload);

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expectLooseApiText(errorBody.message, /name|ten bat dong san|district|quan|required|bat buoc/i);
    });

    test("[BLD-012] - API Admin Building - Coordinates - Missing Latitude and Longitude Validation", async ({ adminBuildingApi }) => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.latitude;
      delete invalidPayload.longitude;

      const response = await adminBuildingApi.create(invalidPayload);

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/latitude|longitude|t?a d?|required|b?t bu?c/i);
    });

    test("[BLD-013] - API Admin Building - Address Fields - Empty Ward and Street Validation", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.create({ ...validPayload, ward: "", street: "" });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expectLooseApiText(errorBody.message, /ward|street|phuong|duong|bat buoc|khong duoc de trong/i);
    });

    test("[BLD-014] - API Admin Building - Property Type - Unsupported Value Handling", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.create({ ...validPayload, propertyType: "VILLA_LUXURY" });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expectLooseApiText(errorBody.message, /property|type|loai|unsupported|khong hop le|khong ho tro|enum/i);
    });

    test("[BLD-003] - API Admin Building - Number of Floor - Negative Value Validation", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.create({ ...validPayload, numberOfFloor: -99 });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expect(errorBody.message).toMatch(/floor|t?ng|s? t?ng|>=\s*0|khng m|number/i);
    });

    test("[BLD-018] - API Admin Building - Metadata - Filter Options Schema", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.metadata();

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

    test("[BLD-006] - API Admin Building - Listing - Property Type Filtering", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.list({ propertyType: "OFFICE", page: 1, size: 100 });

      const data = await expectPageBody<{
        content: Array<{ id?: number; name?: string }>;
        totalElements?: number;
      }>(response, { status: 200 });
      expect(data.content.length).toBeGreaterThan(0);
      expect(data.content.every((item) => typeof item.id === "number" && typeof item.name === "string")).toBeTruthy();
    });

    test("[BLD-016] - API Admin Building - Pagination - Invalid Page and Size Handling", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.list({ page: 0, size: 0 });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings"
      });
      expectLooseApiText(errorBody.message, /page|size|pagination|phan trang|must|invalid|>=|positive/i);
    });

    test("[BLD-017] - API Admin Building - Search by Name - Empty Result Set", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.list({ name: "XYZNOTEXIST999", page: 1, size: 5 });

      const data = await expectPageBody<{ content: unknown[] }>(response, { status: 200 });
      expect(data.content.length).toBe(0);
    });

    test("[BLD-007] - API Admin Building - Update Building - Nonexistent Building Rejection", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.update(missingId, { ...validPayload, id: null });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/buildings/${missingId}`
      });
      expectLooseApiText(errorBody.message, /building|toa nha|bat dong san|khong ton tai|khong tim thay|not found/i);
    });

    test("[BLD-008] - API Admin Building - Update Building - Sold Building Update Restriction", async ({ adminApi: admin, adminBuildingApi, cleanupRegistry }) => {
      const tempSaleContract = await TempEntityHelper.taoSaleContractTam(admin);
      cleanupRegistry.addLabeled(`Delete sale contract scenario ${tempSaleContract.id}`, () => TempEntityHelper.xoaSaleContractTam(admin, tempSaleContract));

      const response = await adminBuildingApi.update(
        tempSaleContract.building.id,
        TestDataFactory.buildBuildingPayload(
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
      );

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/buildings/${tempSaleContract.building.id}`
      });
      expectLooseApiText(errorBody.message, /sold|da ban|sale contract|hop dong mua ban/i);

      const rows = await TestDbRepository.query<{ name: string }>("SELECT name FROM building WHERE id = ?", [tempSaleContract.building.id]);
      expect(rows[0]?.name).toBe(tempSaleContract.building.name);
    });

    test("[BLD-010] - API Admin Building - Delete Building - Active Contract Deletion Restriction", async ({ adminApi: admin, adminBuildingApi, cleanupRegistry }) => {
      const tempContract = await TempEntityHelper.taoContractTam(admin);
      cleanupRegistry.addLabeled(`Delete contract scenario ${tempContract.id}`, () => TempEntityHelper.xoaContractTam(admin, tempContract));

      const response = await adminBuildingApi.deleteById(tempContract.building.id);

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/buildings/${tempContract.building.id}`
      });
      expectLooseApiText(errorBody.message, /hop dong|lien quan|contract/i);

      const rows = await TestDbRepository.query<{ count: number }>("SELECT COUNT(*) AS count FROM building WHERE id = ?", [tempContract.building.id]);
      expect(Number(rows[0]?.count ?? 0)).toBe(1);
    });

    test("[BLD-019] - API Admin Building - Delete Building - Active Sale Contract Deletion Restriction", async ({ adminApi: admin, adminBuildingApi, cleanupRegistry }) => {
      const tempSaleContract = await TempEntityHelper.taoSaleContractTam(admin);
      cleanupRegistry.addLabeled(`Delete sale contract scenario ${tempSaleContract.id}`, () => TempEntityHelper.xoaSaleContractTam(admin, tempSaleContract));

      const response = await adminBuildingApi.deleteById(tempSaleContract.building.id);

      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/buildings/${tempSaleContract.building.id}`
      });
    });

    test("[BLD-015] - API Admin Building - Delete Building - Nonexistent Building Error Handling", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.deleteById(missingSmallId);

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: `/api/v1/admin/buildings/${missingSmallId}`
      });
      expectLooseApiText(errorBody.message, /building|toa nha|bat dong san|khong ton tai|khong tim thay|not found/i);
    });

    test.describe("Created Building Lifecycle @api", () => {
      test("[BLD-004] - API Admin Building - Create Building - Successful Creation and Database Persistence", async ({ adminBuildingApi }) => {
        const payload = {
          ...validPayload,
          name: TestDataFactory.taoTenToaNha("Auto Test Building")
        } as Record<string, unknown>;
        let buildingId = 0;

        try {
          const response = await adminBuildingApi.create(payload);

          await expectApiMessage(response, {
            status: 200,
            message: apiExpectedMessages.admin.buildings.create,
            dataMode: "null"
          });

          const dbResult = await TestDbRepository.query<{
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
          buildingId = dbResult[0]!.id;
          expect(dbResult[0]!.number_of_floor).toBe(payload.numberOfFloor);
          expect(dbResult[0]!.number_of_basement).toBe(payload.numberOfBasement);
          expect(Number(dbResult[0]!.floor_area)).toBe(payload.floorArea);
          expect(dbResult[0]!.street).toBe(payload.street);
          expect(dbResult[0]!.ward).toBe(payload.ward);
          expect(dbResult[0]!.property_type).toBe(payload.propertyType);
          expect(dbResult[0]!.transaction_type).toBe(payload.transactionType);
        } finally {
          if (buildingId) {
            await adminBuildingApi.deleteById(buildingId);
          }
        }
      });

      test("[BLD-005] - API Admin Building - Listing - Newly Created Building Retrieval", async ({ adminBuildingApi }) => {
        const payload = {
          ...validPayload,
          name: TestDataFactory.taoTenToaNha("Auto Test Building List")
        } as Record<string, unknown>;
        let buildingId = 0;

        try {
          const createResponse = await adminBuildingApi.create(payload);
          await expectApiMessage(createResponse, {
            status: 200,
            message: apiExpectedMessages.admin.buildings.create,
            dataMode: "null"
          });

          const dbResult = await TestDbRepository.query<{ id: number }>(
            "SELECT id FROM building WHERE name = ? ORDER BY id DESC LIMIT 1",
            [String(payload.name)]
          );
          expect(dbResult.length).toBe(1);
          buildingId = dbResult[0]!.id;

          const response = await adminBuildingApi.list({ page: 1, size: 100, name: String(payload.name) });

          const data = await expectPageBody<{
            content: Array<{ id: number; name: string }>;
            totalElements?: number;
          }>(response, { status: 200 });
          const found = data.content.find((building) => building.id === buildingId);
          expect(found).toBeDefined();
          expect(found?.name).toBe(String(payload.name));
        } finally {
          if (buildingId) {
            await adminBuildingApi.deleteById(buildingId);
          }
        }
      });

      test("[BLD-009] - API Admin Building - Update Building - Successful Update and Database Persistence", async ({ adminBuildingApi }) => {
        const payload = {
          ...validPayload,
          name: TestDataFactory.taoTenToaNha("Auto Test Building Update")
        } as Record<string, unknown>;
        let buildingId = 0;

        try {
          const createResponse = await adminBuildingApi.create(payload);
          await expectApiMessage(createResponse, {
            status: 200,
            message: apiExpectedMessages.admin.buildings.create,
            dataMode: "null"
          });

          const createdRows = await TestDbRepository.query<{ id: number }>(
            "SELECT id FROM building WHERE name = ? ORDER BY id DESC LIMIT 1",
            [String(payload.name)]
          );
          expect(createdRows.length).toBe(1);
          buildingId = createdRows[0]!.id;

          const updatedName = `${String(payload.name)} - UPDATED`;
          const response = await adminBuildingApi.update(buildingId, {
            ...validPayload,
            id: buildingId,
            name: updatedName,
            floorArea: 999
          });

          await expectApiMessage(response, {
            status: 200,
            message: apiExpectedMessages.admin.buildings.update,
            dataMode: "null"
          });

          const dbResult = await TestDbRepository.query<{ name: string; floor_area: number }>(
            "SELECT name, floor_area FROM building WHERE id = ?",
            [buildingId]
          );
          expect(dbResult[0]!.name).toContain("UPDATED");
          expect(Number(dbResult[0]!.floor_area)).toBe(999);
        } finally {
          if (buildingId) {
            await adminBuildingApi.deleteById(buildingId);
          }
        }
      });

      test("[BLD-011] - API Admin Building - Delete Building - Successful Deletion and Database Removal", async ({ adminBuildingApi }) => {
        const payload = {
          ...validPayload,
          name: TestDataFactory.taoTenToaNha("Auto Test Building Delete")
        } as Record<string, unknown>;
        let buildingId = 0;
        let deleted = false;

        try {
          const createResponse = await adminBuildingApi.create(payload);
          await expectApiMessage(createResponse, {
            status: 200,
            message: apiExpectedMessages.admin.buildings.create,
            dataMode: "null"
          });

          const createdRows = await TestDbRepository.query<{ id: number }>(
            "SELECT id FROM building WHERE name = ? ORDER BY id DESC LIMIT 1",
            [String(payload.name)]
          );
          expect(createdRows.length).toBe(1);
          buildingId = createdRows[0]!.id;

          const response = await adminBuildingApi.deleteById(buildingId);

          await expectApiMessage(response, {
            status: 200,
            message: apiExpectedMessages.admin.buildings.delete,
            dataMode: "null"
          });
          deleted = true;

          const dbResult = await TestDbRepository.query<{ id: number }>(
            "SELECT id FROM building WHERE id = ?",
            [buildingId]
          );
          expect(dbResult.length).toBe(0);
        } finally {
          if (buildingId && !deleted) {
            await adminBuildingApi.deleteById(buildingId);
          }
        }
      });
    });
  });

  test.describe("Image Upload @api", () => {
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

    test("[BLD-U06] - API Admin Building Image - File Content - Empty File Validation", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.uploadImage({
        file: { name: "empty.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
      expectLooseApiText(errorBody.message, /file|tep|anh|empty|rong|chon/i);
    });

    test("[BLD-U02] - API Admin Building Image - Media Type - Unsupported Format Validation", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.uploadImage({
        file: ApiFileFixtures.invalidText()
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
      expect(errorBody.message).toMatch(/image|mime|type|d?nh d?ng|t?p|jpg|png|webp|h? tr?/i);
    });

    test("[BLD-U07] - API Admin Building Image - File Extension - Mismatched Image Extension Validation", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.uploadImage({
        file: { name: "image.gif", mimeType: "image/jpeg", buffer: Buffer.from("fake gif data") }
      });

      const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
      expect(errorBody.message).toMatch(/extension|file|jpg|jpeg|d?nh d?ng/i);
    });

    test("[BLD-U03] - API Admin Building Image - File Integrity - Corrupted JPG Acceptance Behavior", async ({ adminBuildingApi }) => {
      let uploadedFilename = "";
      try {
        const response = await adminBuildingApi.uploadImage({
          file: ApiFileFixtures.corruptJpg()
        });

        const data = await expectApiMessage<{ message?: string; data?: { filename?: string } }>(response, {
          status: 200,
          message: apiExpectedMessages.admin.buildings.upload,
          dataMode: "object"
        });
        uploadedFilename = data.data?.filename ?? "";
        expect(uploadedFilename).toMatch(/\.jpg$/);
      } finally {
        await cleanupUploadedFileByName("building", uploadedFilename);
      }
    });

    test("[BLD-U04] - API Admin Building Image - File Size - Maximum Size Validation", async ({ adminBuildingApi }) => {
      const response = await adminBuildingApi.uploadImage({
        file: { name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(5 * 1024 * 1024 + 16, "0") }
      });

      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/buildings/image"
      });
    });

    test("[BLD-U05] - API Admin Building Image - Upload - Successful JPG Upload and Generated Filename", async ({ adminBuildingApi }) => {
      const sourceFile = ApiFileFixtures.buildingJpg();
      let uploadedFilename = "";
      try {
        const response = await adminBuildingApi.uploadImage({
          file: sourceFile
        });

        const data = await expectApiMessage<{ message?: string; data?: { filename?: string } }>(response, {
          status: 200,
          message: apiExpectedMessages.admin.buildings.upload,
          dataMode: "object"
        });
        uploadedFilename = data.data?.filename ?? "";
        expect(uploadedFilename).toBeDefined();
        expect(uploadedFilename).not.toBe(sourceFile.name);
        expect(uploadedFilename).toMatch(/\.jpg$/);
      } finally {
        await cleanupUploadedFileByName("building", uploadedFilename);
      }
    });
  });
});
