import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { createRoleContext } from "@api/adminApiUtils";
import { expectStatusExact } from "@api/apiContractUtils";
import { TestDbRepository } from "@db/repositories";
import { env } from "@config/env";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

test.describe("Payment - API QR Payment @api-write @destructive @regression", () => {
  test.describe.configure({ mode: "serial" });

  let adminContext: APIRequestContext;
  let customerUsername = env.customerUsername;
  let customerInvoiceId: number;
  let nonexistentInvoiceId: number;
  let tempInvoice: Awaited<ReturnType<typeof TempEntityHelper.taoInvoiceTam>> | null = null;

  async function findNonexistentInvoiceId(): Promise<number> {
    const candidates = [2_147_483_647, 2_147_483_646, 2_147_483_645];
    for (const candidate of candidates) {
      const rows = await TestDbRepository.query<{ id: number }>("SELECT id FROM invoice WHERE id = ? LIMIT 1", [candidate]);
      if (rows.length === 0) {
        return candidate;
      }
    }

    throw new Error("Could not find a stable nonexistent invoice id for payment tests.");
  }

  test.beforeAll(async ({ playwright }) => {
    adminContext = await createRoleContext(playwright, "admin");
    tempInvoice = await TempEntityHelper.taoInvoiceTam(adminContext);
    customerInvoiceId = tempInvoice.id;
    customerUsername = tempInvoice.contract.customer.username;
    nonexistentInvoiceId = await findNonexistentInvoiceId();
  });

  test.afterAll(async () => {
    if (tempInvoice) {
      const existingRows = await TestDbRepository.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [tempInvoice.id]);
      if (existingRows.length > 0) {
        await TestDbRepository.execute(
          "UPDATE invoice SET status = ?, paid_date = NULL, payment_method = NULL, transaction_code = NULL WHERE id = ?",
          [TestDataFactory.invoiceStatus.pending, tempInvoice.id]
        );
      }
      await TempEntityHelper.xoaInvoiceTam(adminContext, tempInvoice);
    }

    await adminContext.dispose();
  });

  test("[API-PAY-001] - API Payment - QR Payment - Anonymous Access Rejection", async ({ anonymousApi }) => {
    const response = await anonymousApi.get(`/payment-demo/qr/${customerInvoiceId}`, {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expectStatusExact(response, 302, "Anonymous QR access currently redirects to login");
    expect(response.headers().location ?? "").toContain("/login");
  });

  test("[API-PAY-002] - API Payment - QR Payment - Admin Access to Customer Invoice Rejection", async ({ adminApi }) => {
    const response = await adminApi.get(`/payment-demo/qr/${customerInvoiceId}`, {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expectStatusExact(response, 302, "Admin QR access currently redirects to login");
    expect(response.headers().location ?? "").toContain("/login");
  });

  test("[API-PAY-003] - API Payment - Invoice Reference - Nonexistent Invoice 404 Response", async ({ playwright }) => {
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

  test("[API-PAY-004] - API Payment - QR Payment - Customer-Owned Invoice HTML Rendering @smoke", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer", customerUsername);
    try {
      const response = await customer.get(`/payment-demo/qr/${customerInvoiceId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 200, "Customer QR render should succeed");
      expect(response.headers()["content-type"] ?? "").toContain("text/html");

      const bodyHtml = await response.text();
      const normalizedBodyHtml = bodyHtml.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      expect(normalizedBodyHtml).toMatch(/thanh toan bang qr|qr payment/i);
      expect(bodyHtml).toContain("img.vietqr.io");
      expect(bodyHtml).toContain(`MOONNEST INV ${customerInvoiceId}`);
      expect(bodyHtml).toContain(`/payment-demo/qr/confirm/${customerInvoiceId}`);
    } finally {
      await customer.dispose();
    }
  });

  test("[API-PAY-005] - API Payment - QR Payment Confirmation - Invoice List Redirection", async ({ playwright }) => {
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

      const rows = await TestDbRepository.query<{
        status: string;
        payment_method: string;
        transaction_code: string | null;
        paid_date: string | null;
      }>(
        "SELECT status, payment_method, transaction_code, paid_date FROM invoice WHERE id = ?",
        [customerInvoiceId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0]!.status).toBe(TestDataFactory.invoiceStatus.paid);
      expect(rows[0]!.payment_method).toBe(TestDataFactory.paymentMethod.bankQr);
      expect(rows[0]!.transaction_code).toMatch(new RegExp(`^QR-${customerInvoiceId}-\\d{14}$`));
      expect(rows[0]!.paid_date).toBeTruthy();
    } finally {
      await customer.dispose();
    }
  });
});
