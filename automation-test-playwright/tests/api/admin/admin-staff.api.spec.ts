import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";

test.describe("Admin Staff API Tests @api @regression", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let createdStaffId: number;

  const uniqueSuffix = Date.now();
  const validStaffPayload = {
    username: `autostaff${uniqueSuffix}`,
    password: "password123",
    fullName: "Auto Test Staff",
    phone: `0900${String(uniqueSuffix).slice(-6)}`,
    email: `autostaff${uniqueSuffix}@estate.com`,
    role: "STAFF"
  };

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
    adminCookies = await ApiAuthHelper.loginAsAdmin();
  });

  test.afterAll(async () => {
    if (createdStaffId) {
      await db.query("DELETE FROM assignment_building WHERE staff_id = ?", [createdStaffId]).catch(() => {});
      await db.query("DELETE FROM assignment_customer WHERE staff_id = ?", [createdStaffId]).catch(() => {});
      await db.query("DELETE FROM staff WHERE id = ?", [createdStaffId]).catch(() => {});
    }
    await db.disconnect();
  });

  test.describe.serial("Staff CRUD and assignments", () => {
    test("[STF_001] POST /staff rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", { data: validStaffPayload });
      expect(response.status()).toBe(401);
    });

    test("[STF_002] POST /staff rejects username shorter than 4", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: { ...validStaffPayload, username: "abc" }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_017] POST /staff rejects password shorter than 6", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: { ...validStaffPayload, password: "12345" }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_003] POST /staff rejects invalid phone format", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: { ...validStaffPayload, phone: "1987654321" }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_018] POST /staff rejects fullName longer than 100 chars", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: { ...validStaffPayload, fullName: "A".repeat(101) }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_015] POST /staff accepts username length 4 boundary", async ({ request }) => {
      const boundaryPayload = {
        ...validStaffPayload,
        username: `ab${String(uniqueSuffix).slice(-2)}`,
        email: `bnd4_${uniqueSuffix}@estate.com`,
        phone: `0800${String(uniqueSuffix).slice(-6)}`
      };
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: boundaryPayload
      });
      expect(response.status()).toBe(200);

      const rows = await db.query("SELECT id FROM staff WHERE username = ?", [boundaryPayload.username]);
      if (rows.length > 0) {
        await db.query("DELETE FROM staff WHERE id = ?", [rows[0].id]).catch(() => {});
      }
    });

    test("[STF_016] POST /staff rejects username longer than 30", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: { ...validStaffPayload, username: "a".repeat(31) }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_004] POST /staff creates staff and persists to DB", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: validStaffPayload
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM staff WHERE username = ?", [validStaffPayload.username]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].email).toBe(validStaffPayload.email);
      expect(dbResult[0].full_name).toBe(validStaffPayload.fullName);
      createdStaffId = dbResult[0].id;
      expect(createdStaffId).toBeGreaterThan(0);
    });

    test("[STF_005] POST /staff rejects duplicate username", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: validStaffPayload
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_019] POST /staff rejects duplicate email", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: {
          ...validStaffPayload,
          username: `unique_${uniqueSuffix}`,
          phone: "0911111111"
        }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_020] POST /staff rejects duplicate phone", async ({ request }) => {
      const response = await request.post("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        data: {
          ...validStaffPayload,
          username: `unique2_${uniqueSuffix}`,
          email: `unique2_${uniqueSuffix}@estate.com`
        }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_006] GET /staff lists paged staff data", async ({ request }) => {
      const response = await request.get("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 100 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
    });

    test("[STF_007] GET /staff searches by username", async ({ request }) => {
      const response = await request.get("/api/v1/admin/staff", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 10, username: validStaffPayload.username }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
    });

    test("[STF_022] GET /staff/customers loads customer options", async ({ request }) => {
      const response = await request.get("/api/v1/admin/staff/customers", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("[STF_008] GET /staff/buildings loads building options", async ({ request }) => {
      const response = await request.get("/api/v1/admin/staff/buildings", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("[STF_009] PUT /staff/{id}/assignments/buildings assigns buildings", async ({ request }) => {
      const buildings = await db.query("SELECT id FROM building ORDER BY id LIMIT 2");
      if (buildings.length < 2) {
        test.skip(true, "Need at least 2 buildings in DB");
        return;
      }
      const assignedIds = buildings.map((item: { id: number }) => item.id);

      const response = await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        headers: { Cookie: adminCookies },
        data: assignedIds
      });
      expect(response.status()).toBe(200);

      const dbCheck = await db.query("SELECT building_id FROM assignment_building WHERE staff_id = ?", [createdStaffId]);
      const dbIds = dbCheck.map((row: { building_id: number }) => row.building_id);
      for (const id of assignedIds) {
        expect(dbIds).toContain(id);
      }
    });

    test("[STF_010] GET /staff/{id}/assignments/buildings returns assignments", async ({ request }) => {
      const response = await request.get(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    test("[STF_023] PUT /staff/{id}/assignments/buildings rejects nonexistent staff", async ({ request }) => {
      const response = await request.put("/api/v1/admin/staff/999999/assignments/buildings", {
        headers: { Cookie: adminCookies },
        data: [1]
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_011] PUT /staff/{id}/assignments/customers assigns customers", async ({ request }) => {
      const customers = await db.query("SELECT id FROM customer ORDER BY id LIMIT 1");
      if (customers.length === 0) {
        test.skip(true, "Need at least 1 customer in DB");
        return;
      }
      const assignedIds = customers.map((item: { id: number }) => item.id);
      const response = await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        headers: { Cookie: adminCookies },
        data: assignedIds
      });
      expect(response.status()).toBe(200);
    });

    test("[STF_012] DELETE /staff/{id} rejects delete while assignments exist", async ({ request }) => {
      const response = await request.delete(`/api/v1/admin/staff/${createdStaffId}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_021] DELETE /staff/{id} rejects nonexistent id", async ({ request }) => {
      const response = await request.delete("/api/v1/admin/staff/999999", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(400);
    });

    test("[STF_013] PUT /staff/{id}/assignments clears assignments", async ({ request }) => {
      await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
        headers: { Cookie: adminCookies },
        data: []
      });
      await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
        headers: { Cookie: adminCookies },
        data: []
      });
    });

    test("[STF_014] DELETE /staff/{id} deletes created staff", async ({ request }) => {
      const response = await request.delete(`/api/v1/admin/staff/${createdStaffId}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM staff WHERE id = ?", [createdStaffId]);
      if (dbResult.length > 0) {
        expect(dbResult[0].is_deleted || dbResult[0].deleted || dbResult[0].status === "DELETED").toBeTruthy();
      } else {
        expect(dbResult.length).toBe(0);
      }
      createdStaffId = 0;
    });
  });
});
