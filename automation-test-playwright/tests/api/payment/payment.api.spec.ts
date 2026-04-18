import { expect, test, type APIRequestContext } from "@playwright/test";
import { createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact } from "@api/apiContractUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { env } from "@config/env";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

test.describe("Payment API (QR VietQR) Contract Tests @api @api-write @regression", () => {
  let adminContext: APIRequestContext;
  let customerUsername = env.customerUsername;
  let customerInvoiceId: number;
  let nonexistentInvoiceId: number;
  let tempInvoice: Awaited<ReturnType<typeof TempEntityHelper.taoInvoiceTam>> | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminContext = await createRoleContext(playwright, "admin");
    tempInvoice = await TempEntityHelper.taoInvoiceTam(adminContext);
    customerInvoiceId = tempInvoice.id;
    customerUsername = tempInvoice.contract.customer.username;

    const maxRow = await MySqlDbClient.query<{ maxId: number }>("SELECT MAX(id) AS maxId FROM invoice");
    nonexistentInvoiceId = (maxRow[0]?.maxId ?? 0) + 99999;
  });

  test.afterAll(async () => {
    if (tempInvoice) {
      const existingRows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [tempInvoice.id]);
      if (existingRows.length > 0) {
        await MySqlDbClient.execute(
          "UPDATE invoice SET status = 'PENDING', paid_date = NULL, payment_method = NULL, transaction_code = NULL WHERE id = ?",
          [tempInvoice.id]
        );
      }
      await TempEntityHelper.xoaInvoiceTam(adminContext, tempInvoice);
    }

    await adminContext.dispose();
    await MySqlDbClient.close();
  });

  test("API-PAY-001 rejects anonymous QR access @regression", async ({ playwright }) => {
    const anonymous = await playwright.request.newContext({ baseURL: env.baseUrl });
    try {
      const response = await anonymous.get(`/payment-demo/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 302, "Anonymous QR access currently redirects to login");
      expect(response.headers().location ?? "").toContain("/login");
    } finally {
      await anonymous.dispose();
    }
  });

  test("API-PAY-002 rejects admin access to customer QR @regression", async ({ playwright }) => {
    const admin = await createRoleContext(playwright, "admin");
    try {
      const response = await admin.get(`/payment-demo/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 302, "Admin QR access currently redirects to login");
      expect(response.headers().location ?? "").toContain("/login");
    } finally {
      await admin.dispose();
    }
  });

  test("API-PAY-003 returns 404 for missing invoice id @regression", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer", customerUsername);
    try {
      const response = await customer.get(`/payment-demo/qr/${nonexistentInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 302, "Missing invoice QR access should redirect to invoice list");
      expect(response.headers().location ?? "").toContain("/customer/invoice/list?payNotFound");
    } finally {
      await customer.dispose();
    }
  });

  test("API-PAY-004 renders QR HTML for customer-owned invoice @smoke @regression", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer", customerUsername);
    try {
      const response = await customer.get(`/payment-demo/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 200, "Customer QR render should succeed");
      expect(response.headers()["content-type"] ?? "").toContain("text/html");

      const bodyHtml = await response.text();
      expect(bodyHtml).toMatch(/Thanh to(?:á|&aacute;)n b(?:ằ|&#7857;)ng QR/);
      expect(bodyHtml).toContain("img.vietqr.io");
      expect(bodyHtml).toContain(`MOONNEST INV ${customerInvoiceId}`);
      expect(bodyHtml).toContain(`/payment-demo/qr/confirm/${customerInvoiceId}`);
    } finally {
      await customer.dispose();
    }
  });

  test("API-PAY-005 confirms QR payment and redirects to invoice list @regression", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer", customerUsername);
    try {
      const pageResponse = await customer.get(`/payment-demo/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(pageResponse, 200, "QR page must render before confirm");
      const bodyHtml = await pageResponse.text();
      const tokenMatch = bodyHtml.match(/name="token"[^>]*value="([^"]+)"/);
      expect(tokenMatch).not.toBeNull();

      const response = await customer.post(`/payment-demo/qr/confirm/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        form: {
          token: tokenMatch?.[1] ?? ""
        }
      });
      expectStatusExact(response, 302, "QR confirmation should redirect after success");
      expect(response.headers().location ?? "").toContain("/customer/invoice/list?paySuccess");

      const rows = await MySqlDbClient.query<{
        status: string;
        payment_method: string;
        transaction_code: string | null;
        paid_date: string | null;
      }>(
        "SELECT status, payment_method, transaction_code, paid_date FROM invoice WHERE id = ?",
        [customerInvoiceId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0]!.status).toBe("PAID");
      expect(rows[0]!.payment_method).toBe("BANK_QR");
      expect(rows[0]!.transaction_code).toMatch(new RegExp(`^QR-${customerInvoiceId}-\\d{14}$`));
      expect(rows[0]!.paid_date).toBeTruthy();
    } finally {
      await customer.dispose();
    }
  });
});
