import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";

test.describe("Admin Customer API Tests @api @regression", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let createdCustomerId: number;

  const uniqueSuffix = Date.now();
  const validCustomerPayload = {
    username: `autocust${uniqueSuffix}`,
    password: "password123",
    fullName: "Auto Test Customer",
    phone: `0700${String(uniqueSuffix).slice(-6)}`,
    email: `autocust${uniqueSuffix}@customer.com`,
    staffIds: [1]
  };

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
    adminCookies = await ApiAuthHelper.loginAsAdmin();

    const staff = await db.query("SELECT id FROM staff ORDER BY id LIMIT 1");
    if (staff.length > 0) {
      validCustomerPayload.staffIds = [staff[0].id];
    }
  });

  test.afterAll(async () => {
    if (createdCustomerId) {
      await db.query("DELETE FROM assignment_customer WHERE customer_id = ?", [createdCustomerId]).catch(() => {});
      await db.query("DELETE FROM customer WHERE id = ?", [createdCustomerId]).catch(() => {});
    }
    await db.disconnect();
  });

  test.describe.serial("Customer CRUD", () => {
    test("[CUS_001] POST /customers rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", { data: validCustomerPayload });
      expect(response.status()).toBe(401);
    });

    test("[CUS_002] POST /customers rejects empty staffIds", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: { ...validCustomerPayload, staffIds: [] }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_009] POST /customers rejects username shorter than 4", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: { ...validCustomerPayload, username: "abc" }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_003] POST /customers rejects password shorter than 6", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: { ...validCustomerPayload, password: "123" }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_010] POST /customers rejects oversized email", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: { ...validCustomerPayload, email: `${"a".repeat(95)}@b.com` }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_011] POST /customers rejects invalid phone format", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: { ...validCustomerPayload, phone: "9999999999" }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_004] POST /customers creates customer and persists to DB", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: validCustomerPayload
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM customer WHERE email = ?", [validCustomerPayload.email]);
      if (dbResult.length > 0) {
        expect(dbResult[0].email).toBe(validCustomerPayload.email);
        createdCustomerId = dbResult[0].id;
      } else {
        const fallback = await db.query(
          "SELECT c.id FROM customer c JOIN user u ON c.account_id = u.id WHERE u.email = ?",
          [validCustomerPayload.email]
        );
        expect(fallback.length).toBeGreaterThan(0);
        createdCustomerId = fallback[0].id;
      }
      expect(createdCustomerId).toBeGreaterThan(0);
    });

    test("[CUS_012] POST /customers rejects duplicate username/email", async ({ request }) => {
      const response = await request.post("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        data: validCustomerPayload
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_005] GET /customers lists created customer", async ({ request }) => {
      const response = await request.get("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 50 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
      const found = data.content.find(
        (item: { id: number; email: string }) => item.id === createdCustomerId || item.email === validCustomerPayload.email
      );
      expect(found).toBeDefined();
    });

    test("[CUS_006] GET /customers searches by fullName", async ({ request }) => {
      const response = await request.get("/api/v1/admin/customers", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 10, fullName: "Auto Test Customer" }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.content.length).toBeGreaterThanOrEqual(1);
    });

    test("[CUS_007] DELETE /customers/{id} rejects delete for customer with contract", async ({ request }) => {
      const customerWithContract = await db.query(`
        SELECT DISTINCT c.id FROM customer c
        INNER JOIN contract ct ON ct.customer_id = c.id
        LIMIT 1
      `);

      if (customerWithContract.length === 0) {
        test.skip(true, "No customer with contract found");
        return;
      }

      const response = await request.delete(`/api/v1/admin/customers/${customerWithContract[0].id}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_013] DELETE /customers/{id} rejects nonexistent id", async ({ request }) => {
      const response = await request.delete("/api/v1/admin/customers/999999", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(400);
    });

    test("[CUS_008] DELETE /customers/{id} deletes created customer", async ({ request }) => {
      const response = await request.delete(`/api/v1/admin/customers/${createdCustomerId}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM customer WHERE id = ?", [createdCustomerId]);
      if (dbResult.length > 0) {
        expect(dbResult[0].is_deleted || dbResult[0].deleted || dbResult[0].status === "DELETED").toBeTruthy();
      } else {
        expect(dbResult.length).toBe(0);
      }
      createdCustomerId = 0;
    });
  });
});
