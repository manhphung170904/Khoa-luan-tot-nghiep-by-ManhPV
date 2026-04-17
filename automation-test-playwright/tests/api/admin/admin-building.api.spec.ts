import { expect, test, type APIRequestContext } from "@playwright/test";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe.serial("Admin Building API Tests @api @regression", () => {
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

  test.describe("Building CRUD", () => {
    test("[BLD_001] POST /buildings rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: validPayload
      });
      expect(response.status()).toBe(401);
    });

    test("[BLD_002] POST /buildings rejects missing required fields", async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.name;
      delete invalidPayload.districtId;

      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: invalidPayload
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_012] POST /buildings rejects missing latitude and longitude", async () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.latitude;
      delete invalidPayload.longitude;

      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: invalidPayload
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_013] POST /buildings rejects blank ward and street", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, ward: "", street: "" }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_014] POST /buildings fails on unsupported propertyType", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, propertyType: "VILLA_LUXURY" }
      });

      expect(response.status()).toBe(500);
    });

    test("[BLD_003] POST /buildings rejects negative numberOfFloor", async () => {
      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: { ...validPayload, numberOfFloor: -99 }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_004] POST /buildings creates building and persists to DB", async () => {
      const payload = {
        ...validPayload,
        name: TestDataFactory.taoTenToaNha("Auto Test Building")
      } as Record<string, unknown>;

      const response = await admin.post("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        data: payload
      });

      expect(response.status()).toBe(200);
      const createBody = (await response.json()) as { message?: string };
      expect(createBody.message).toBeTruthy();

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

    test("[BLD_005] GET /buildings lists the created building", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { page: 1, size: 100 }
      });

      expect(response.status()).toBe(200);
      const data = (await response.json()) as {
        content: Array<{ id: number; name: string }>;
        totalElements?: number;
      };
      expect(Array.isArray(data.content)).toBeTruthy();
      expect(typeof data.totalElements).toBe("number");
      const found = data.content.find((building) => building.id === createdBuildingId);
      expect(found).toBeDefined();
      expect(found?.name).toBe(createdBuildingName);
    });

    test("[BLD_018] GET /buildings/metadata returns filter options shape", async () => {
      const response = await admin.get("/api/v1/admin/buildings/metadata", {
        failOnStatusCode: false
      });

      expect(response.status()).toBe(200);
      const data = (await response.json()) as {
        propertyTypes?: unknown[];
        transactionTypes?: unknown[];
        directions?: unknown[];
        levels?: unknown[];
        managers?: unknown[];
      };
      expect(Array.isArray(data.propertyTypes)).toBeTruthy();
      expect(Array.isArray(data.transactionTypes)).toBeTruthy();
      expect(Array.isArray(data.directions)).toBeTruthy();
      expect(Array.isArray(data.levels)).toBeTruthy();
      expect(Array.isArray(data.managers)).toBeTruthy();
    });

    test("[BLD_006] GET /buildings filters by propertyType", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { propertyType: "OFFICE", page: 1, size: 100 }
      });

      expect(response.status()).toBe(200);
      const data = (await response.json()) as {
        content: Array<{ id?: number; name?: string }>;
        totalElements?: number;
      };
      expect(typeof data.totalElements).toBe("number");
      expect(data.content.length).toBeGreaterThan(0);
      expect(data.content.every((item) => typeof item.id === "number" && typeof item.name === "string")).toBeTruthy();
    });

    test("[BLD_016] GET /buildings fails for page=0,size=0", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { page: 0, size: 0 }
      });

      expect(response.status()).toBe(500);
    });

    test("[BLD_017] GET /buildings returns empty content for unknown name", async () => {
      const response = await admin.get("/api/v1/admin/buildings", {
        failOnStatusCode: false,
        params: { name: "XYZNOTEXIST999", page: 1, size: 5 }
      });

      expect(response.status()).toBe(200);
      const data = (await response.json()) as { content: unknown[] };
      expect(data.content.length).toBe(0);
    });

    test("[BLD_007] PUT /buildings/{id} rejects update for nonexistent building", async () => {
      const response = await admin.put("/api/v1/admin/buildings/999999999", {
        failOnStatusCode: false,
        data: { ...validPayload, id: null }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_008] PUT /buildings/{id} blocks sold building updates with temp sale-contract data", async () => {
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

        expect(response.status()).toBe(400);
      } finally {
        await TempEntityHelper.xoaSaleContractTam(admin, tempSaleContract);
      }
    });

    test("[BLD_009] PUT /buildings/{id} updates created building and DB", async () => {
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

      expect(response.status()).toBe(200);
      const updateBody = (await response.json()) as { message?: string };
      expect(updateBody.message).toBeTruthy();

      const dbResult = await MySqlDbClient.query<{ name: string; floor_area: number }>(
        "SELECT name, floor_area FROM building WHERE id = ?",
        [createdBuildingId]
      );
      expect(dbResult[0]!.name).toContain("UPDATED");
      expect(Number(dbResult[0]!.floor_area)).toBe(999);
      createdBuildingName = updatedName;
    });

    test("[BLD_010] DELETE /buildings/{id} blocks delete when contracts exist on temp data", async () => {
      const tempContract = await TempEntityHelper.taoContractTam(admin);

      try {
        const response = await admin.delete(`/api/v1/admin/buildings/${tempContract.building.id}`, {
          failOnStatusCode: false
        });

        expect(response.status()).toBe(400);
      } finally {
        await TempEntityHelper.xoaContractTam(admin, tempContract);
      }
    });

    test("[BLD_019] DELETE /buildings/{id} should block delete when sale contracts exist on temp data", async () => {
      test.fail(true, "Backend currently checks rent contracts only and may still allow delete despite existing sale contract.");
      const tempSaleContract = await TempEntityHelper.taoSaleContractTam(admin);

      try {
        const response = await admin.delete(`/api/v1/admin/buildings/${tempSaleContract.building.id}`, {
          failOnStatusCode: false
        });

        expect(response.status()).toBe(400);
      } finally {
        await MySqlDbClient.execute("DELETE FROM sale_contract WHERE id = ?", [tempSaleContract.id]).catch(() => {});
        await TempEntityHelper.capNhatPhanCongCustomer(admin, tempSaleContract.staff.id, []).catch(() => {});
        await TempEntityHelper.capNhatPhanCongBuilding(admin, tempSaleContract.staff.id, []).catch(() => {});
        await TempEntityHelper.xoaCustomerTam(admin, tempSaleContract.customer.id).catch(() => {});
        await TempEntityHelper.xoaBuildingTam(admin, tempSaleContract.building.id).catch(() => {});
        await TempEntityHelper.xoaStaffTam(admin, tempSaleContract.staff.id).catch(() => {});
      }
    });

    test("[BLD_015] DELETE /buildings/{id} returns not-found contract for missing id", async () => {
      const response = await admin.delete("/api/v1/admin/buildings/999999", {
        failOnStatusCode: false
      });

      expect(response.status()).toBe(400);
      const body = (await response.json()) as { message?: string };
      expect(body.message).toBeTruthy();
    });

    test("[BLD_011] DELETE /buildings/{id} deletes created building", async () => {
      const response = await admin.delete(`/api/v1/admin/buildings/${createdBuildingId}`, {
        failOnStatusCode: false
      });

      expect(response.status()).toBe(200);
      const deleteBody = (await response.json()) as { message?: string };
      expect(deleteBody.message).toBeTruthy();

      const dbResult = await MySqlDbClient.query<{ id: number }>(
        "SELECT id FROM building WHERE id = ?",
        [createdBuildingId]
      );
      expect(dbResult.length).toBe(0);

      createdBuildingId = 0;
      createdBuildingName = "";
    });
  });

  test.describe("Image Upload", () => {
    test("[BLD_U01] POST /buildings/image rejects anonymous upload", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: ApiFileFixtures.buildingJpg()
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[BLD_U06] POST /buildings/image rejects empty file", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: { name: "empty.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) }
        }
      });

      expect(response.status()).toBe(400);
      const data = (await response.json()) as { message?: string };
      expect(data.message).toBeTruthy();
    });

    test("[BLD_U02] POST /buildings/image rejects unsupported mime type", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: ApiFileFixtures.invalidText()
        }
      });

      expect(response.status()).toBe(400);
      const data = (await response.json()) as { message?: string };
      expect(data.message).toBeTruthy();
    });

    test("[BLD_U07] POST /buildings/image rejects invalid extension even with image mime", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: { name: "image.gif", mimeType: "image/jpeg", buffer: Buffer.from("fake gif data") }
        }
      });

      expect(response.status()).toBe(400);
      const data = (await response.json()) as { message?: string };
      expect(data.message).toBeTruthy();
    });

    test("[BLD_U03] POST /buildings/image currently accepts corrupt JPG content when mime/ext pass", async () => {
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: ApiFileFixtures.corruptJpg()
        }
      });

      expect(response.status()).toBe(200);
      const data = (await response.json()) as { message?: string; data?: { filename?: string } };
      expect(data.message).toBeTruthy();
      expect(data.data?.filename).toMatch(/\.jpg$/);
    });

    test("[BLD_U04] POST /buildings/image rejects file larger than 5MB", async () => {
      test.fail(true, "Backend/runtime currently accepts oversized multipart upload instead of returning 400.");
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: { name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(5 * 1024 * 1024 + 16, "0") }
        }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_U05] POST /buildings/image uploads valid JPG and returns generated filename", async () => {
      const sourceFile = ApiFileFixtures.buildingJpg();
      const response = await admin.post("/api/v1/admin/buildings/image", {
        failOnStatusCode: false,
        multipart: {
          file: sourceFile
        }
      });

      expect(response.status()).toBe(200);
      const data = (await response.json()) as { message?: string; data?: { filename?: string } };
      expect(data.message).toBeTruthy();
      expect(data.data?.filename).toBeDefined();
      expect(data.data?.filename).not.toBe(sourceFile.name);
      expect(data.data?.filename).toMatch(/\.jpg$/);
    });
  });
});
