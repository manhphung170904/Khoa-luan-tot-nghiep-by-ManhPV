import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";

test.describe("Admin Building API Tests @api @regression", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let createdBuildingId: number;

  const validPayload = {
    districtId: 1,
    numberOfFloor: 10,
    numberOfBasement: 2,
    floorArea: 500,
    name: "Auto Test Building",
    ward: "Auto Ward",
    street: "Auto Street",
    propertyType: "OFFICE",
    transactionType: "FOR_RENT",
    rentPrice: 25,
    latitude: 10.762622,
    longitude: 106.660172
  };

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
    adminCookies = await ApiAuthHelper.loginAsAdmin();
  });

  test.afterAll(async () => {
    if (createdBuildingId) {
      await db.query("DELETE FROM building WHERE id = ?", [createdBuildingId]).catch(() => {});
    }
    await db.disconnect();
  });

  test.describe.serial("Building CRUD", () => {
    test("[BLD_001] POST /buildings rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings", { data: validPayload });
      expect(response.status()).toBe(401);
    });

    test("[BLD_002] POST /buildings rejects missing required fields", async ({ request }) => {
      const invalidPayload = { ...validPayload };
      delete (invalidPayload as Record<string, unknown>).name;
      delete (invalidPayload as Record<string, unknown>).districtId;

      const response = await request.post("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        data: invalidPayload
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_012] POST /buildings rejects missing latitude and longitude", async ({ request }) => {
      const invalidPayload = { ...validPayload };
      delete (invalidPayload as Record<string, unknown>).latitude;
      delete (invalidPayload as Record<string, unknown>).longitude;

      const response = await request.post("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        data: invalidPayload
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_013] POST /buildings rejects blank ward and street", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, ward: "", street: "" }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_014] POST /buildings fails on unsupported propertyType", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, propertyType: "VILLA_LUXURY" }
      });

      expect(response.status()).toBe(500);
    });

    test("[BLD_003] POST /buildings rejects negative numberOfFloor", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, numberOfFloor: -99 }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_004] POST /buildings creates building and persists to DB", async ({ request }) => {
      const payload = { ...validPayload, name: `Auto Test Building ${Date.now()}` };

      const response = await request.post("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        data: payload
      });

      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM building WHERE name = ? ORDER BY id DESC LIMIT 1", [payload.name]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].number_of_floor).toBe(payload.numberOfFloor);
      expect(dbResult[0].number_of_basement).toBe(payload.numberOfBasement);
      expect(Number(dbResult[0].floor_area)).toBe(payload.floorArea);
      expect(dbResult[0].street).toBe(payload.street);
      expect(dbResult[0].ward).toBe(payload.ward);
      expect(dbResult[0].property_type).toBe(payload.propertyType);
      expect(dbResult[0].transaction_type).toBe(payload.transactionType);

      createdBuildingId = dbResult[0].id;
      validPayload.name = payload.name;
    });

    test("[BLD_005] GET /buildings lists the created building", async ({ request }) => {
      const response = await request.get("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 100 }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
      const found = data.content.find((building: { id: number; name: string }) => building.id === createdBuildingId);
      expect(found).toBeDefined();
      expect(found.name).toBe(validPayload.name);
    });

    test("[BLD_006] GET /buildings filters by propertyType", async ({ request }) => {
      const response = await request.get("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        params: { propertyType: "OFFICE", page: 1, size: 100 }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.content.length).toBeGreaterThan(0);
    });

    test("[BLD_016] GET /buildings fails for page=0,size=0", async ({ request }) => {
      const response = await request.get("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        params: { page: 0, size: 0 }
      });

      expect(response.status()).toBe(500);
    });

    test("[BLD_017] GET /buildings returns empty content for unknown name", async ({ request }) => {
      const response = await request.get("/api/v1/admin/buildings", {
        headers: { Cookie: adminCookies },
        params: { name: "XYZNOTEXIST999", page: 1, size: 5 }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.content.length).toBe(0);
    });

    test("[BLD_007] PUT /buildings/{id} rejects update for nonexistent building", async ({ request }) => {
      const response = await request.put("/api/v1/admin/buildings/999999999", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, id: null }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_008] PUT /buildings/{id} blocks sold building updates when seed data exists", async ({ request }) => {
      const soldBuilding = await db.query("SELECT building_id FROM sale_contract LIMIT 1");

      if (soldBuilding.length === 0) {
        test.skip(true, "No sold building found in DB");
        return;
      }

      const soldBuildingId = soldBuilding[0].building_id;
      const response = await request.put(`/api/v1/admin/buildings/${soldBuildingId}`, {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, id: soldBuildingId }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_009] PUT /buildings/{id} updates created building and DB", async ({ request }) => {
      const response = await request.put(`/api/v1/admin/buildings/${createdBuildingId}`, {
        headers: { Cookie: adminCookies },
        data: {
          ...validPayload,
          id: createdBuildingId,
          name: `${validPayload.name} - UPDATED`,
          floorArea: 999
        }
      });

      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM building WHERE id = ?", [createdBuildingId]);
      expect(dbResult[0].name).toContain("UPDATED");
      expect(Number(dbResult[0].floor_area)).toBe(999);
      validPayload.name = `${validPayload.name} - UPDATED`;
    });

    test("[BLD_010] DELETE /buildings/{id} blocks delete when contracts exist", async ({ request }) => {
      const buildingWithContract = await db.query("SELECT DISTINCT building_id FROM contract LIMIT 1");

      if (buildingWithContract.length === 0) {
        test.skip(true, "No building with contract found in DB");
        return;
      }

      const response = await request.delete(`/api/v1/admin/buildings/${buildingWithContract[0].building_id}`, {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_015] DELETE /buildings/{id} returns not-found contract for missing id", async ({ request }) => {
      const response = await request.delete("/api/v1/admin/buildings/999999", {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_011] DELETE /buildings/{id} deletes created building", async ({ request }) => {
      const response = await request.delete(`/api/v1/admin/buildings/${createdBuildingId}`, {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM building WHERE id = ?", [createdBuildingId]);
      if (dbResult.length > 0) {
        expect(dbResult[0].is_deleted || dbResult[0].deleted).toBe(1);
      } else {
        expect(dbResult.length).toBe(0);
      }

      createdBuildingId = 0;
    });
  });

  test.describe("Image Upload", () => {
    test("[BLD_U01] POST /buildings/image rejects anonymous upload", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        multipart: {
          file: { name: "test.png", mimeType: "image/png", buffer: Buffer.from("fake image") }
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[BLD_U06] POST /buildings/image rejects empty file", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "empty.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) }
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Please select an image file");
    });

    test("[BLD_U02] POST /buildings/image rejects unsupported mime type", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "virus.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("fake binary") }
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Only JPG, PNG and WEBP files are supported");
    });

    test("[BLD_U07] POST /buildings/image rejects invalid extension even with image mime", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "image.gif", mimeType: "image/jpeg", buffer: Buffer.from("fake gif data") }
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Only .jpg, .jpeg, .png and .webp extensions are supported");
    });

    test("[BLD_U03] POST /buildings/image currently accepts shell payload disguised as JPG", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: {
            name: "shell.jpg",
            mimeType: "image/jpeg",
            buffer: Buffer.from('<?php echo "Hacked"; system($_GET["cmd"]); ?>')
          }
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("File uploaded successfully.");
      expect(data.data.filename).toMatch(/\.jpg$/);
    });

    test("[BLD_U04] POST /buildings/image rejects file larger than 5MB", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(5 * 1024 * 1024 + 16, "0") }
        }
      });

      expect(response.status()).toBe(400);
    });

    test("[BLD_U05] POST /buildings/image uploads valid JPG and returns generated filename", async ({ request }) => {
      const response = await request.post("/api/v1/admin/buildings/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "building_photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("fake valid jpeg binary") }
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("File uploaded successfully.");
      expect(data.data.filename).toBeDefined();
      expect(data.data.filename).not.toBe("building_photo.jpg");
      expect(data.data.filename).toMatch(/\.jpg$/);
    });
  });
});
