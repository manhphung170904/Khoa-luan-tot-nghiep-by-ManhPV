import { test, expect } from "@playwright/test";
import { createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact } from "@api/apiContractUtils";
import { DatabaseHelper } from "../../../utils/db-client";
import { env } from "../../../config/env";

test.describe("Payment API (QR VietQR) Contract Tests", () => {
  let db: DatabaseHelper;
  let customerInvoiceId: number;
  let nonexistentInvoiceId: number;

  test.beforeAll(async () => {
    db = new DatabaseHelper();
    await db.connect();

    const invoiceRows = await db.query<{ id: number }>(
      "SELECT i.id FROM invoice i JOIN customer c ON i.customer_id = c.id WHERE c.username = ? ORDER BY i.id DESC LIMIT 1",
      [env.customerUsername]
    );
    expect(invoiceRows.length).toBeGreaterThan(0);
    customerInvoiceId = invoiceRows[0]!.id;

    const maxRow = await db.query<{ maxId: number }>("SELECT MAX(id) AS maxId FROM invoice");
    nonexistentInvoiceId = (maxRow[0]?.maxId ?? 0) + 99999;
  });

  test.afterAll(async () => {
    await db.disconnect();
  });

  test("API-PAY-001 rejects anonymous QR access", async ({ playwright }) => {
    const anonymous = await playwright.request.newContext({ baseURL: env.baseUrl });
    try {
      const response = await anonymous.get(`/api/v1/payment/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 401, "Anonymous QR access must be rejected");
    } finally {
      await anonymous.dispose();
    }
  });

  test("API-PAY-002 rejects admin access to customer QR", async ({ playwright }) => {
    const admin = await createRoleContext(playwright, "admin");
    try {
      const response = await admin.get(`/api/v1/payment/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 401, "Only customer role may access QR payment page");
    } finally {
      await admin.dispose();
    }
  });

  test("API-PAY-003 returns 404 for missing invoice id", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer");
    try {
      const response = await customer.get(`/api/v1/payment/qr/${nonexistentInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 404, "Unknown invoice QR request should return 404");
    } finally {
      await customer.dispose();
    }
  });

  test("API-PAY-004 renders QR HTML for customer-owned invoice", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer");
    try {
      const response = await customer.get(`/api/v1/payment/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 200, "Customer QR render should succeed");

      const bodyHtml = await response.text();
      expect(bodyHtml).toContain("Thanh to");
      expect(bodyHtml).toContain("img.vietqr.io");
      expect(bodyHtml).toContain(`/api/v1/payment/qr/confirm/${customerInvoiceId}`);
    } finally {
      await customer.dispose();
    }
  });

  test("API-PAY-005 confirms QR payment and redirects to invoice list", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer");
    try {
      const response = await customer.get(`/api/v1/payment/qr/confirm/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 302, "QR confirmation should redirect after success");
      expect(response.headers().location).toContain("/customer/invoice/list?paySuccess");

      const rows = await db.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [customerInvoiceId]);
      expect(rows.length).toBe(1);
      expect(rows[0]!.status).toBe("PAID");
    } finally {
      await customer.dispose();
    }
  });
});

