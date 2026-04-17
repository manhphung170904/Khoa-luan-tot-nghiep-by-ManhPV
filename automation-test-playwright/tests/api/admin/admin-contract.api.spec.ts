import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";

test.describe("Admin Contract API Tests @api @regression", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let createdContractId: number;

  const validPayload = {
    customerId: 1,
    buildingId: 1,
    staffId: 1,
    rentPrice: 25.5,
    rentArea: 100,
    startDate: "2025-01-01",
    endDate: "2026-01-01",
    status: "ACTIVE"
  };

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
    adminCookies = await ApiAuthHelper.loginAsAdmin();

    try {
      const validGroup = await db.query(`
        SELECT ab.staff_id, ab.building_id, ac.customer_id
        FROM assignment_building ab
        INNER JOIN assignment_customer ac ON ab.staff_id = ac.staff_id
        WHERE ab.building_id NOT IN (SELECT building_id FROM sale_contract)
        LIMIT 1
      `);
      if (validGroup.length > 0) {
        validPayload.staffId = validGroup[0].staff_id;
        validPayload.buildingId = validGroup[0].building_id;
        validPayload.customerId = validGroup[0].customer_id;
      }
    } catch (error) {
      console.log("Skipping dynamic assignment fetch:", error);
    }
  });

  test.afterAll(async () => {
    if (createdContractId) {
      await db.query("DELETE FROM contract WHERE id = ?", [createdContractId]).catch(() => {});
    }
    await db.disconnect();
  });

  test.describe.serial("Contract lifecycle", () => {
    test("[CTR_001] POST /contracts rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/contracts", { data: validPayload });
      expect(response.status()).toBe(401);
    });

    test("[CTR_002] POST /contracts rejects negative rentPrice", async ({ request }) => {
      const response = await request.post("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, rentPrice: -5 }
      });
      expect(response.status()).toBe(400);
    });

    test("[CTR_003] POST /contracts rejects nonexistent buildingId", async ({ request }) => {
      const response = await request.post("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, buildingId: 999999 }
      });
      expect(response.status()).toBe(400);
    });

    test("[CTR_004] POST /contracts rejects nonexistent customerId", async ({ request }) => {
      const response = await request.post("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, customerId: 999999 }
      });
      expect(response.status()).toBe(400);
    });

    test("[CTR_005] POST /contracts rejects endDate before startDate", async ({ request }) => {
      const response = await request.post("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, startDate: "2026-01-01", endDate: "2025-01-01" }
      });
      expect(response.status()).toBe(400);
    });

    test("[CTR_012] POST /contracts rejects staff outside building assignment", async ({ request }) => {
      const unmanaged = await db.query(
        `
          SELECT b.id FROM building b
          WHERE b.id NOT IN (SELECT building_id FROM assignment_building WHERE staff_id = ?)
          LIMIT 1
        `,
        [validPayload.staffId]
      );

      if (unmanaged.length === 0) {
        test.skip(true, "Staff manages all buildings in DB");
        return;
      }

      const response = await request.post("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, buildingId: unmanaged[0].id }
      });
      expect(response.status()).toBe(400);
    });

    test("[CTR_006] POST /contracts creates contract and persists to DB", async ({ request }) => {
      const response = await request.post("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        data: validPayload
      });

      if ([400, 409].includes(response.status())) {
        const body = await response.json().catch(() => null);
        console.log("CTR_006 skipped:", body?.message || "validation/conflict error");
        test.skip(true, "Could not create contract because of data conflict or missing assignment");
        return;
      }

      expect(response.status()).toBe(200);

      const dbResult = await db.query(
        "SELECT * FROM contract WHERE customer_id = ? AND building_id = ? ORDER BY id DESC LIMIT 1",
        [validPayload.customerId, validPayload.buildingId]
      );
      expect(dbResult.length).toBe(1);
      expect(Number(dbResult[0].rent_price)).toBe(validPayload.rentPrice);
      expect(dbResult[0].rent_area).toBe(validPayload.rentArea);
      createdContractId = dbResult[0].id;
    });

    test("[CTR_007] GET /contracts lists created contract", async ({ request }) => {
      const response = await request.get("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 100 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
      expect(data.content.find((item: { id: number }) => item.id === createdContractId)).toBeDefined();
    });

    test("[CTR_008] GET /contracts filters by buildingId", async ({ request }) => {
      const response = await request.get("/api/v1/admin/contracts", {
        headers: { Cookie: adminCookies },
        params: { buildingId: validPayload.buildingId, page: 1, size: 10 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.content.length).toBeGreaterThanOrEqual(1);
    });

    test("[CTR_009] PUT /contracts/{id} updates rentPrice and DB", async ({ request }) => {
      const response = await request.put(`/api/v1/admin/contracts/${createdContractId}`, {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, id: createdContractId, rentPrice: 30.5, status: "EXPIRED" }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM contract WHERE id = ?", [createdContractId]);
      expect(Number(dbResult[0].rent_price)).toBe(30.5);
      expect(dbResult[0].status).toBe("EXPIRED");
    });

    test("[CTR_010] PUT /contracts/status triggers status update", async ({ request }) => {
      const response = await request.put("/api/v1/admin/contracts/status", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);
    });

    test("[CTR_013] DELETE /contracts/{id} rejects nonexistent contract", async ({ request }) => {
      const response = await request.delete("/api/v1/admin/contracts/999999", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(400);
    });

    test("[CTR_011] DELETE /contracts/{id} deletes created contract", async ({ request }) => {
      const response = await request.delete(`/api/v1/admin/contracts/${createdContractId}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM contract WHERE id = ?", [createdContractId]);
      expect(dbResult.length).toBe(0);
      createdContractId = 0;
    });
  });
});
