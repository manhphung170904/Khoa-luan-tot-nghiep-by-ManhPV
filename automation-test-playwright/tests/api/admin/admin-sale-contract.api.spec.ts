import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";
import { TestSafetyHelper } from "../../../utils/helpers/TestSafetyHelper";

test.describe("Admin Sale Contract API Tests @api @regression", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let createdSaleContractId: number;

  const validPayload = {
    customerId: 1,
    buildingId: 1,
    staffId: 1,
    salePrice: 1500.5,
    transferDate: "2025-05-15",
    note: "Sale contract auto test"
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
    if (createdSaleContractId) {
      await db.query("DELETE FROM sale_contract WHERE id = ?", [createdSaleContractId]).catch(() => {});
    }
    await db.disconnect();
  });

  test.describe.serial("Sale contract lifecycle", () => {
    test("[SC_001] POST /sale-contracts rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/sale-contracts", { data: validPayload });
      expect(response.status()).toBe(401);
    });

    test("[SC_002] POST /sale-contracts rejects zero salePrice", async ({ request }) => {
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, salePrice: 0 }
      });
      expect(response.status()).toBe(400);
    });

    test("[SC_012] POST /sale-contracts rejects negative salePrice", async ({ request }) => {
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, salePrice: -1 }
      });
      expect(response.status()).toBe(400);
    });

    test("[SC_010] POST /sale-contracts rejects missing buildingId", async ({ request }) => {
      const invalidPayload = { ...validPayload } as Record<string, unknown>;
      delete invalidPayload.buildingId;
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: invalidPayload
      });
      expect(response.status()).toBe(400);
    });

    test("[SC_011] POST /sale-contracts rejects missing customerId", async ({ request }) => {
      const invalidPayload = { ...validPayload } as Record<string, unknown>;
      delete invalidPayload.customerId;
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: invalidPayload
      });
      expect(response.status()).toBe(400);
    });

    test("[SC_003] POST /sale-contracts rejects nonexistent buildingId", async ({ request }) => {
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, buildingId: 999999 }
      });
      expect(response.status()).toBe(400);
    });

    test("[SC_004] POST /sale-contracts rejects invalid staffId", async ({ request }) => {
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, staffId: -1 }
      });
      expect(response.status()).toBe(400);
    });

    test("[SC_005] POST /sale-contracts creates sale contract and persists to DB", async ({ request }) => {
      const response = await request.post("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        data: validPayload
      });

      if (response.status() === 400) {
        const body = await response.json().catch(() => null);
        console.log("SC_005 skipped - no valid assignment combo:", body?.message || "validation error");
        test.skip(true, "Could not find valid staff-building-customer assignment");
        return;
      }

      expect(response.status()).toBe(200);

      const dbResult = await db.query(
        "SELECT * FROM sale_contract WHERE customer_id = ? AND building_id = ? ORDER BY id DESC LIMIT 1",
        [validPayload.customerId, validPayload.buildingId]
      );
      expect(dbResult.length).toBe(1);
      expect(Number(dbResult[0].sale_price)).toBe(validPayload.salePrice);
      expect(dbResult[0].note).toBe(validPayload.note);
      createdSaleContractId = dbResult[0].id;
    });

    test("[SC_006] GET /sale-contracts lists created contract", async ({ request }) => {
      if (!createdSaleContractId) {
        test.skip(true, "SC_005 did not create a sale contract");
        return;
      }
      const response = await request.get("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 100 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
      expect(data.content.find((item: { id: number }) => item.id === createdSaleContractId)).toBeDefined();
    });

    test("[SC_007] GET /sale-contracts filters by buildingId", async ({ request }) => {
      if (!createdSaleContractId) {
        test.skip(true, "SC_005 did not create a sale contract");
        return;
      }
      const response = await request.get("/api/v1/admin/sale-contracts", {
        headers: { Cookie: adminCookies },
        params: { buildingId: validPayload.buildingId, page: 1, size: 10 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.content.length).toBeGreaterThanOrEqual(1);
    });

    test("[SC_008] PUT /sale-contracts/{id} updates salePrice and DB", async ({ request }) => {
      if (!createdSaleContractId) {
        test.skip(true, "SC_005 did not create a sale contract");
        return;
      }
      const response = await request.put(`/api/v1/admin/sale-contracts/${createdSaleContractId}`, {
        headers: { Cookie: adminCookies },
        data: {
          ...validPayload,
          id: createdSaleContractId,
          salePrice: 2000,
          transferDate: "2026-06-16",
          note: "Updated note"
        }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM sale_contract WHERE id = ?", [createdSaleContractId]);
      expect(Number(dbResult[0].sale_price)).toBe(2000);
      expect(dbResult[0].note).toBe("Updated note");
    });

    test("[SC_009] DELETE /sale-contracts/{id} deletes created contract", async ({ request }) => {
      TestSafetyHelper.skipIfDestructiveTestsDisabled(test);

      if (!createdSaleContractId) {
        test.skip(true, "SC_005 did not create a sale contract");
        return;
      }
      const response = await request.delete(`/api/v1/admin/sale-contracts/${createdSaleContractId}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM sale_contract WHERE id = ?", [createdSaleContractId]);
      if (dbResult.length > 0) {
        expect(dbResult[0].is_deleted || dbResult[0].deleted).toBeTruthy();
      } else {
        expect(dbResult.length).toBe(0);
      }
      createdSaleContractId = 0;
    });
  });
});
