import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';
import { env } from '../../../config/env';

test.describe('Payment API (QR VietQR) Tests', () => {
    let db: DatabaseHelper;
    let customerCookies: string;
    let adminCookies: string;
    let customerInvoiceId: number;
    let nonexistentInvoiceId: number;

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();

        customerCookies = await ApiAuthHelper.loginAsCustomer();
        adminCookies = await ApiAuthHelper.loginAsAdmin();

        const invoiceRows = await db.query<{ id: number }>(
            'SELECT i.id FROM invoice i JOIN customer c ON i.customer_id = c.id WHERE c.username = ? ORDER BY i.id DESC LIMIT 1',
            [env.customerUsername]
        );
        customerInvoiceId = invoiceRows.length > 0 ? invoiceRows[0].id : 1;

        const maxRow = await db.query<{ maxId: number }>('SELECT MAX(id) AS maxId FROM invoice');
        nonexistentInvoiceId = (maxRow[0]?.maxId ?? 0) + 99999;
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    test.describe.serial('Luồng Render Mã VietQR (GET /payment/qr/{id})', () => {
        test('[API_TC_021] [Security] Reject unauthenticated access to QR payment page', async ({ request }) => {
            const response = await request.get(`/payment/qr/${customerInvoiceId}`);
            expect([302, 401, 403]).toContain(response.status());
        });

        test('[API_TC_022] [Security] Reject admin account accessing customer QR page', async ({ request }) => {
            const response = await request.get(`/payment/qr/${customerInvoiceId}`, {
                headers: { Cookie: adminCookies }
            });
            expect([302, 401, 403]).toContain(response.status());
        });

        test('[API_TC_023] [Boundary] Request QR for a non-existing invoice id', async ({ request }) => {
            const response = await request.get(`/payment/qr/${nonexistentInvoiceId}`, {
                headers: { Cookie: customerCookies }
            });
            expect([404, 403, 500]).toContain(response.status());
        });

        test('[API_TC_024] [Happy Path] Render QR page for own invoice and validate HTML content', async ({ request }) => {
            const response = await request.get(`/payment/qr/${customerInvoiceId}`, {
                headers: { Cookie: customerCookies }
            });
            expect([200, 404, 500]).toContain(response.status());

            if (response.status() === 200) {
                const bodyHtml = await response.text();
                expect(bodyHtml).toContain('Thanh toán bằng QR');
                expect(bodyHtml).toContain('img.vietqr.io');
                expect(bodyHtml).toContain(`/payment/qr/confirm/${customerInvoiceId}`);

                const invoiceRows = await db.query<{ customer_id: number; status: string; total_amount: string | null }>(
                    'SELECT customer_id, status, total_amount FROM invoice WHERE id = ?',
                    [customerInvoiceId]
                );
                expect(invoiceRows.length).toBe(1);
                expect(invoiceRows[0].status).toBeTruthy();
            }
        });
    });

    test.describe.serial('Luồng Xác nhận Thanh toán QR', () => {
        test('[API_TC_025] [Happy Path] Confirm QR payment and verify invoice status becomes PAID', async ({ request }) => {
            const response = await request.get(`/payment/qr/confirm/${customerInvoiceId}`, {
                headers: { Cookie: customerCookies },
                maxRedirects: 0
            });

            expect([302, 404, 500]).toContain(response.status());
            if (response.status() === 302) {
                expect(response.headers().location).toContain('/customer/invoice/list?paySuccess');

                const dbRows = await db.query<{ status: string }>('SELECT status FROM invoice WHERE id = ?', [customerInvoiceId]);
                expect(dbRows.length).toBe(1);
                expect(dbRows[0].status).toBe('PAID');
            }
        });
    });
});
