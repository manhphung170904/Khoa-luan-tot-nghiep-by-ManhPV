import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";

test.describe("Admin Building Additional Information API @api @extended", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let buildingId: number;

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
    adminCookies = await ApiAuthHelper.loginAsAdmin();

    const buildings = await db.query("SELECT id FROM building ORDER BY id LIMIT 1");
    buildingId = buildings.length > 0 ? buildings[0].id : 1;
  });

  test.afterAll(async () => {
    await db.disconnect();
  });

  test.describe.serial("Legal Authority CRUD", () => {
    let createdLegalAuthorityId: number;

    test("[BAI_LA_SEC] POST /legal-authorities rejects anonymous access", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/legal-authorities", {
        data: { buildingId, authorityName: "Test Security", authorityType: "NOTARY" }
      });

      expect(response.status()).toBe(401);
    });

    test("[BAI_LA_NEG] POST /legal-authorities fails when buildingId is missing", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/legal-authorities", {
        headers: { Cookie: adminCookies },
        data: { authorityName: "Missing building", authorityType: "NOTARY" }
      });

      expect(response.status()).toBe(500);
    });

    test("[BAI_LA_BND] POST /legal-authorities rejects oversized authorityName", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/legal-authorities", {
        headers: { Cookie: adminCookies },
        data: { buildingId, authorityName: "A".repeat(300), authorityType: "NOTARY" }
      });

      expect(response.status()).toBe(400);
    });

    test("[BAI_LA_C] POST /legal-authorities creates record and persists to DB", async ({ request }) => {
      const payload = {
        buildingId,
        authorityName: "Auto Notary Office",
        authorityType: "NOTARY",
        address: "123 Test Street",
        phone: "0123456789",
        email: "contact@notary-auto.com",
        note: "Auto test"
      };

      const response = await request.post("/api/v1/admin/building-additional-information/legal-authorities", {
        headers: { Cookie: adminCookies },
        data: payload
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.authorityName).toBe(payload.authorityName);

      createdLegalAuthorityId = data.id;

      const dbResult = await db.query("SELECT * FROM legal_authority WHERE id = ?", [createdLegalAuthorityId]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].authority_name).toBe(payload.authorityName);
      expect(dbResult[0].email).toBe(payload.email);
      expect(dbResult[0].building_id).toBe(buildingId);
    });

    test("[BAI_LA_R] GET /legal-authorities/{buildingId} returns created record", async ({ request }) => {
      const response = await request.get(`/api/v1/admin/building-additional-information/legal-authorities/${buildingId}`, {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);
      const list = await response.json();
      expect(Array.isArray(list)).toBeTruthy();
      const found = list.find((item: { id: number; authorityName: string }) => item.id === createdLegalAuthorityId);
      expect(found).toBeDefined();
      expect(found.authorityName).toBe("Auto Notary Office");
    });

    test("[BAI_LA_U] PUT /legal-authorities/{id} updates record and DB", async ({ request }) => {
      const response = await request.put(
        `/api/v1/admin/building-additional-information/legal-authorities/${createdLegalAuthorityId}`,
        {
          headers: { Cookie: adminCookies },
          data: {
            buildingId,
            authorityName: "Auto Law Office Updated",
            authorityType: "LAW_FIRM",
            address: "456 Update Street",
            phone: "0987654321",
            email: "updated@notary.com",
            note: "Updated"
          }
        }
      );

      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM legal_authority WHERE id = ?", [createdLegalAuthorityId]);
      expect(dbResult[0].authority_name).toBe("Auto Law Office Updated");
      expect(dbResult[0].phone).toBe("0987654321");
      expect(dbResult[0].authority_type).toBe("LAW_FIRM");
    });

    test("[BAI_LA_D] DELETE /legal-authorities/{id} removes record", async ({ request }) => {
      const response = await request.delete(
        `/api/v1/admin/building-additional-information/legal-authorities/${createdLegalAuthorityId}`,
        {
          headers: { Cookie: adminCookies }
        }
      );

      expect(response.status()).toBe(200);
      const dbResult = await db.query("SELECT * FROM legal_authority WHERE id = ?", [createdLegalAuthorityId]);
      expect(dbResult.length).toBe(0);
      createdLegalAuthorityId = 0;
    });
  });

  test.describe.serial("Nearby Amenity CRUD", () => {
    let createdAmenityId: number;

    test("[BAI_NA_SEC] POST /nearby-amenities rejects anonymous access", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/nearby-amenities", {
        data: { buildingId, name: "Test Security", amenityType: "PARK" }
      });

      expect(response.status()).toBe(401);
    });

    test("[BAI_NA_C] POST /nearby-amenities creates record and persists to DB", async ({ request }) => {
      const payload = {
        buildingId,
        name: "Auto Test Park",
        amenityType: "PARK",
        distanceMeter: 500,
        address: "123 Test Street",
        latitude: 10.762,
        longitude: 106.66
      };

      const response = await request.post("/api/v1/admin/building-additional-information/nearby-amenities", {
        headers: { Cookie: adminCookies },
        data: payload
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      createdAmenityId = data.id;

      const dbResult = await db.query("SELECT * FROM nearby_amenity WHERE id = ?", [createdAmenityId]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].name).toBe(payload.name);
    });

    test("[BAI_NA_R] GET /nearby-amenities/{buildingId} returns created record", async ({ request }) => {
      const response = await request.get(`/api/v1/admin/building-additional-information/nearby-amenities/${buildingId}`, {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);
      const list = await response.json();
      expect(list.some((item: { id: number }) => item.id === createdAmenityId)).toBeTruthy();
    });

    test("[BAI_NA_U] PUT /nearby-amenities/{id} updates record and DB", async ({ request }) => {
      const response = await request.put(
        `/api/v1/admin/building-additional-information/nearby-amenities/${createdAmenityId}`,
        {
          headers: { Cookie: adminCookies },
          data: {
            buildingId,
            name: "Auto Test Park Updated",
            amenityType: "PARK",
            distanceMeter: 600,
            address: "456 Update Street",
            latitude: 10.763,
            longitude: 106.661
          }
        }
      );

      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT name, distance_meter FROM nearby_amenity WHERE id = ?", [createdAmenityId]);
      expect(dbResult[0].name).toBe("Auto Test Park Updated");
      expect(dbResult[0].distance_meter).toBe(600);
    });

    test("[BAI_NA_D] DELETE /nearby-amenities/{id} removes record", async ({ request }) => {
      const response = await request.delete(
        `/api/v1/admin/building-additional-information/nearby-amenities/${createdAmenityId}`,
        {
          headers: { Cookie: adminCookies }
        }
      );

      expect(response.status()).toBe(200);
      const dbResult = await db.query("SELECT * FROM nearby_amenity WHERE id = ?", [createdAmenityId]);
      expect(dbResult.length).toBe(0);
    });
  });

  test.describe.serial("Supplier CRUD", () => {
    let createdSupplierId: number;

    test("[BAI_SP_SEC] POST /suppliers rejects anonymous access", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/suppliers", {
        data: { buildingId, name: "Test", serviceType: "CLEANING" }
      });

      expect(response.status()).toBe(401);
    });

    test("[BAI_SP_C] POST /suppliers creates record and persists to DB", async ({ request }) => {
      const payload = {
        buildingId,
        name: "Auto Cleaning Co",
        serviceType: "CLEANING",
        phone: "0901234567",
        email: "clean@auto.com",
        address: "1A Test Street",
        note: "Auto test"
      };

      const response = await request.post("/api/v1/admin/building-additional-information/suppliers", {
        headers: { Cookie: adminCookies },
        data: payload
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      createdSupplierId = data.id;

      const dbResult = await db.query("SELECT * FROM supplier WHERE id = ?", [createdSupplierId]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].name).toBe(payload.name);
    });

    test("[BAI_SP_R] GET /suppliers/{buildingId} returns created record", async ({ request }) => {
      const response = await request.get(`/api/v1/admin/building-additional-information/suppliers/${buildingId}`, {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);
      const list = await response.json();
      expect(list.some((item: { id: number }) => item.id === createdSupplierId)).toBeTruthy();
    });

    test("[BAI_SP_U] PUT /suppliers/{id} updates record and DB", async ({ request }) => {
      const response = await request.put(
        `/api/v1/admin/building-additional-information/suppliers/${createdSupplierId}`,
        {
          headers: { Cookie: adminCookies },
          data: {
            buildingId,
            name: "Auto Cleaning Co Updated",
            serviceType: "CLEANING",
            phone: "0909999999",
            email: "vip@auto.com",
            address: "2B Update Street",
            note: "Updated"
          }
        }
      );

      expect(response.status()).toBe(200);
      const dbResult = await db.query("SELECT name FROM supplier WHERE id = ?", [createdSupplierId]);
      expect(dbResult[0].name).toBe("Auto Cleaning Co Updated");
    });

    test("[BAI_SP_D] DELETE /suppliers/{id} removes record", async ({ request }) => {
      const response = await request.delete(
        `/api/v1/admin/building-additional-information/suppliers/${createdSupplierId}`,
        {
          headers: { Cookie: adminCookies }
        }
      );

      expect(response.status()).toBe(200);
      const dbResult = await db.query("SELECT * FROM supplier WHERE id = ?", [createdSupplierId]);
      expect(dbResult.length).toBe(0);
    });
  });

  test.describe.serial("Planning Map CRUD", () => {
    let createdMapId: number;

    test("[BAI_PM_SEC] POST /planning-maps rejects anonymous access", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/planning-maps", {
        data: { buildingId, mapType: "Planning map", issuedBy: "Test" }
      });

      expect(response.status()).toBe(401);
    });

    test("[BAI_PM_C] POST /planning-maps creates record and persists to DB", async ({ request }) => {
      const payload = {
        buildingId,
        mapType: "Planning Auto",
        issuedBy: "Construction Department",
        issuedDate: "2025-01-01",
        expiredDate: "2030-01-01",
        imageUrl: "planning_auto.jpg",
        note: "Auto test"
      };

      const response = await request.post("/api/v1/admin/building-additional-information/planning-maps", {
        headers: { Cookie: adminCookies },
        data: payload
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      createdMapId = data.id;

      const dbResult = await db.query("SELECT * FROM planning_map WHERE id = ?", [createdMapId]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].map_type).toBe(payload.mapType);
    });

    test("[BAI_PM_R] GET /planning-maps/{buildingId} returns created record", async ({ request }) => {
      const response = await request.get(`/api/v1/admin/building-additional-information/planning-maps/${buildingId}`, {
        headers: { Cookie: adminCookies }
      });

      expect(response.status()).toBe(200);
      const list = await response.json();
      expect(list.some((item: { id: number }) => item.id === createdMapId)).toBeTruthy();
    });

    test("[BAI_PM_U] PUT /planning-maps/{id} updates record and DB", async ({ request }) => {
      const response = await request.put(
        `/api/v1/admin/building-additional-information/planning-maps/${createdMapId}`,
        {
          headers: { Cookie: adminCookies },
          data: {
            buildingId,
            mapType: "Planning Auto Updated",
            issuedBy: "Construction Department",
            issuedDate: "2025-01-01",
            expiredDate: "2030-01-01",
            imageUrl: "planning_auto.jpg",
            note: "Updated"
          }
        }
      );

      expect(response.status()).toBe(200);
      const dbResult = await db.query("SELECT map_type FROM planning_map WHERE id = ?", [createdMapId]);
      expect(dbResult[0].map_type).toBe("Planning Auto Updated");
    });

    test("[BAI_PM_D] DELETE /planning-maps/{id} removes record", async ({ request }) => {
      const response = await request.delete(
        `/api/v1/admin/building-additional-information/planning-maps/${createdMapId}`,
        {
          headers: { Cookie: adminCookies }
        }
      );

      expect(response.status()).toBe(200);
      const dbResult = await db.query("SELECT * FROM planning_map WHERE id = ?", [createdMapId]);
      expect(dbResult.length).toBe(0);
    });
  });

  test.describe("Planning Map Image Upload", () => {
    test("[BAI_UP_SEC] POST /planning-maps/image rejects anonymous access", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/planning-maps/image", {
        multipart: {
          file: { name: "test.jpg", mimeType: "image/jpeg", buffer: Buffer.from("fake") }
        }
      });

      expect(response.status()).toBe(401);
    });

    test("[BAI_UP_NEG] POST /planning-maps/image rejects unsupported mime type", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/planning-maps/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") }
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Only JPG, PNG and WEBP files are supported");
    });

    test("[BAI_UP_BND] POST /planning-maps/image rejects file larger than 5MB", async ({ request }) => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 16, "a");
      const response = await request.post("/api/v1/admin/building-additional-information/planning-maps/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "large.jpg", mimeType: "image/jpeg", buffer: largeBuffer }
        }
      });

      expect(response.status()).toBe(400);
    });

    test("[BAI_UP_POS] POST /planning-maps/image uploads a valid JPG", async ({ request }) => {
      const response = await request.post("/api/v1/admin/building-additional-information/planning-maps/image", {
        headers: { Cookie: adminCookies },
        multipart: {
          file: { name: "my_map.jpg", mimeType: "image/jpeg", buffer: Buffer.from("fake valid image binary") }
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
      expect(data.data.filename).toContain("planning_");
      expect(data.data.filename).toMatch(/\.jpg$/);
    });
  });
});
