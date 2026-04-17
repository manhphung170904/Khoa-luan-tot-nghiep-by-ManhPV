import { test, expect } from "@playwright/test";
import { ApiAuthHelper } from "../../../utils/api/apiAuthHelper";
import { DatabaseHelper } from "../../../utils/db-client";

test.describe("Admin Invoice API Tests @api @regression", () => {
  let db: DatabaseHelper;
  let adminCookies: string;
  let createdInvoiceId: number;

  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const dueDateMonth = prevMonth === 12 ? 1 : prevMonth + 1;
  const dueDateYear = prevMonth === 12 ? prevYear + 1 : prevYear;
  const dueDate = `${dueDateYear}-${String(dueDateMonth).padStart(2, "0")}-15`;

  const validPayload = {
    contractId: 1,
    customerId: 1,
    month: prevMonth,
    year: prevYear,
    dueDate,
    totalAmount: 15300.5,
    electricityUsage: 100,
    waterUsage: 25,
    details: [
      { feeName: "Tien dien", amount: 3000 },
      { feeName: "Tien nuoc", amount: 1500 }
    ]
  };

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();
    adminCookies = await ApiAuthHelper.loginAsAdmin();

    try {
      const activeContract = await db.query(`
        SELECT id AS contract_id, customer_id FROM contract
        WHERE status = 'ACTIVE'
        LIMIT 1
      `);
      if (activeContract.length > 0) {
        validPayload.contractId = activeContract[0].contract_id;
        validPayload.customerId = activeContract[0].customer_id;
      }
    } catch (error) {
      console.log("Could not seed contract/customer ID:", error);
    }

    await db.query(
      "DELETE FROM invoice WHERE contract_id = ? AND month = ? AND year = ?",
      [validPayload.contractId, validPayload.month, validPayload.year]
    ).catch(() => {});
  });

  test.afterAll(async () => {
    if (createdInvoiceId) {
      await db.query("DELETE FROM invoice_detail WHERE invoice_id = ?", [createdInvoiceId]).catch(() => {});
      await db.query("DELETE FROM invoice WHERE id = ?", [createdInvoiceId]).catch(() => {});
    }
    await db.disconnect();
  });

  test.describe.serial("Invoice lifecycle", () => {
    test("[INV_001] POST /invoices rejects anonymous create", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", { data: validPayload });
      expect(response.status()).toBe(401);
    });

    test("[INV_002] POST /invoices rejects invalid month type", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, month: "Muoi Hai" }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_003] POST /invoices rejects nonexistent contractId", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, contractId: -1 }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_004] POST /invoices rejects mismatched customerId", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, customerId: 999999 }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_005] POST /invoices rejects dueDate within invoice month", async ({ request }) => {
      const sameDueDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-15`;
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, dueDate: sameDueDate }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_015] POST /invoices rejects current-month invoice creation", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, month: now.getMonth() + 1, year: now.getFullYear() }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_006] POST /invoices creates invoice and persists to DB", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: validPayload
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query(
        "SELECT * FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1",
        [validPayload.contractId, validPayload.month, validPayload.year]
      );
      expect(dbResult.length).toBe(1);
      expect(Number(dbResult[0].total_amount)).toBe(validPayload.totalAmount);
      createdInvoiceId = dbResult[0].id;
    });

    test("[INV_010] POST /invoices rejects duplicate month-year-contract invoice", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        data: validPayload
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_007] GET /invoices lists created invoice", async ({ request }) => {
      const response = await request.get("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 100 }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.content)).toBeTruthy();
      expect(data.content.find((item: { id: number }) => item.id === createdInvoiceId)).toBeDefined();
    });

    test("[INV_008] GET /invoices filters by month", async ({ request }) => {
      const response = await request.get("/api/v1/admin/invoices", {
        headers: { Cookie: adminCookies },
        params: { page: 1, size: 10, month: validPayload.month }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.content.length).toBeGreaterThanOrEqual(1);
    });

    test("[INV_009] PUT /invoices/{id} updates invoice and DB", async ({ request }) => {
      const response = await request.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, id: createdInvoiceId, totalAmount: 19999, details: [] }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM invoice WHERE id = ?", [createdInvoiceId]);
      expect(Number(dbResult[0].total_amount)).toBe(19999);
    });

    test("[INV_011] POST /invoices/{id}/confirm marks invoice as paid", async ({ request }) => {
      const response = await request.post(`/api/v1/admin/invoices/${createdInvoiceId}/confirm`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT status FROM invoice WHERE id = ?", [createdInvoiceId]);
      expect(dbResult[0].status).toBe("PAID");
    });

    test("[INV_016] POST /invoices/{id}/confirm rejects nonexistent invoice", async ({ request }) => {
      const response = await request.post("/api/v1/admin/invoices/999999/confirm", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_012] PUT /invoices/{id} rejects editing paid invoice", async ({ request }) => {
      const response = await request.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        headers: { Cookie: adminCookies },
        data: { ...validPayload, id: createdInvoiceId, totalAmount: 99999 }
      });
      expect(response.status()).toBe(400);
    });

    test("[INV_013] PUT /invoices/status triggers bulk status update", async ({ request }) => {
      const response = await request.put("/api/v1/admin/invoices/status", {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);
    });

    test("[INV_014] DELETE /invoices/{id} deletes invoice", async ({ request }) => {
      const response = await request.delete(`/api/v1/admin/invoices/${createdInvoiceId}`, {
        headers: { Cookie: adminCookies }
      });
      expect(response.status()).toBe(200);

      const dbResult = await db.query("SELECT * FROM invoice WHERE id = ?", [createdInvoiceId]);
      if (dbResult.length > 0) {
        expect(dbResult[0].is_deleted || dbResult[0].deleted).toBeTruthy();
      } else {
        expect(dbResult.length).toBe(0);
      }
      createdInvoiceId = 0;
    });
  });
});
