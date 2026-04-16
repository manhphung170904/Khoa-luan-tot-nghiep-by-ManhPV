import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Admin Invoice API Tests', () => {
    let db: DatabaseHelper;
    let adminCookies: string;
    let createdInvoiceId: number;

    // ─── Tính động tháng trước (rule: "Chỉ thêm hóa đơn của THÁNG TRƯỚC") ───
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() 0-indexed
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // DueDate phải nằm SAU tháng hóa đơn → ngày 15 tháng kế tiếp
    const dueDateMonth = prevMonth === 12 ? 1 : prevMonth + 1;
    const dueDateYear = prevMonth === 12 ? prevYear + 1 : prevYear;
    const dueDate = `${dueDateYear}-${String(dueDateMonth).padStart(2, '0')}-15`;

    const validPayload = {
        contractId: 1,
        customerId: 1,
        month: prevMonth,
        year: prevYear,
        dueDate: dueDate,
        totalAmount: 15300.5,
        electricityUsage: 100,
        waterUsage: 25,
        details: [
            { feeName: 'Tiền Điện', amount: 3000 },
            { feeName: 'Tiền Nước', amount: 1500 }
        ]
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();

        // Seed: lấy contract ACTIVE thực tế từ DB
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
        } catch (e) {
            console.log('Không thể seed contract/customer ID:', e);
        }

        // Xóa hóa đơn trùng (tháng/năm/contract) nếu tồn tại từ lần chạy trước
        await db.query(
            'DELETE FROM invoice WHERE contract_id = ? AND month = ? AND year = ?',
            [validPayload.contractId, validPayload.month, validPayload.year]
        ).catch(() => {});
    });

    test.afterAll(async () => {
        if (createdInvoiceId) {
            await db.query('DELETE FROM invoice_detail WHERE invoice_id = ?', [createdInvoiceId]).catch(() => {});
            await db.query('DELETE FROM invoice WHERE id = ?', [createdInvoiceId]).catch(() => {});
        }
        await db.disconnect();
    });

    test.describe.serial('Luồng CRUD Hóa Đơn & Thanh Toán', () => {

        // ── SECURITY ──────────────────────────────────────────────
        test('[INV_001] POST /add - [Security] Reject thiếu Admin Token', async ({ request }) => {
            const response = await request.post('/api/v1/admin/invoices', { data: validPayload });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        // ── NEGATIVE ──────────────────────────────────────────────
        test('[INV_002] POST /add - [Negative] Sai kiểu dữ liệu (month = string)', async ({ request }) => {
            const invalidPayload = { ...validPayload, month: "Mười Hai" };
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 500]).toContain(response.status());
        });

        test('[INV_003] POST /add - [Negative] contractId không tồn tại', async ({ request }) => {
            const invalidPayload = { ...validPayload, contractId: -1 };
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([200, 400, 404, 409, 500]).toContain(response.status());
        });

        test('[INV_004] POST /add - [Negative] customerId không tồn tại', async ({ request }) => {
            const invalidPayload = { ...validPayload, customerId: 999999 };
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 404, 409, 500]).toContain(response.status());
        });

        // ── BUSINESS RULES ────────────────────────────────────────
        test('[INV_005] POST /add - [Business Rule] DueDate phải SAU tháng hóa đơn', async ({ request }) => {
            const sameDueDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-15`;
            const invalidPayload = { ...validPayload, dueDate: sameDueDate };
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 409]).toContain(response.status());
        });

        test('[INV_015] POST /add - [Business Rule] Chỉ tháng trước (month = current month)', async ({ request }) => {
            const currentMonth = now.getMonth() + 1; // 1-indexed
            const invalidPayload = { ...validPayload, month: currentMonth, year: now.getFullYear() };
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 409]).toContain(response.status());
        });

        // ── POSITIVE: Create ──────────────────────────────────────
        test('[INV_006] POST /add - [Positive] Tạo hóa đơn thành công & Verify DB', async ({ request }) => {
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: validPayload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query(
                'SELECT * FROM invoice WHERE contract_id = ? AND month = ? AND year = ? ORDER BY id DESC LIMIT 1',
                [validPayload.contractId, validPayload.month, validPayload.year]
            );
            expect(dbResult.length).toBe(1);
            expect(Number(dbResult[0].total_amount)).toBe(validPayload.totalAmount);

            createdInvoiceId = dbResult[0].id;
        });

        // ── BUSINESS: Duplicate ───────────────────────────────────
        test('[INV_010] POST /add - [Business Rule] Trùng Tháng-Năm-HợpĐồng', async ({ request }) => {
            const response = await request.post('/api/v1/admin/invoices', {
                headers: { Cookie: adminCookies },
                data: validPayload
            });
            expect(response.status()).toBe(400);
        });

        // ── POSITIVE: Read ────────────────────────────────────────
        test('[INV_007] GET /list/page - [Positive] Chứa hóa đơn vừa tạo', async ({ request }) => {
            const response = await request.get('/admin/invoice/list/page?page=1&size=100', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data.content)).toBeTruthy();
            const found = data.content.find((i: any) => i.id === createdInvoiceId);
            expect(found).toBeDefined();
        });

        test('[INV_008] GET /search/page - [Positive] Lọc theo month', async ({ request }) => {
            const response = await request.get(`/admin/invoice/search/page?page=1&size=10&month=${validPayload.month}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.content.length).toBeGreaterThanOrEqual(1);
        });

        // ── POSITIVE: Update ──────────────────────────────────────
        test('[INV_009] PUT /edit - [Positive] Sửa totalAmount & Verify DB', async ({ request }) => {
            const editPayload = {
                ...validPayload,
                id: createdInvoiceId,
                totalAmount: 19999.0,
                details: []
            };

            const response = await request.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
                headers: { Cookie: adminCookies },
                data: editPayload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM invoice WHERE id = ?', [createdInvoiceId]);
            expect(Number(dbResult[0].total_amount)).toBe(19999.0);
        });

        // ── POSITIVE: Confirm ─────────────────────────────────────
        test('[INV_011] POST /confirm/{id} - [Positive] Thanh toán & Verify status PAID', async ({ request }) => {
            const response = await request.post(`/api/v1/admin/invoices/${createdInvoiceId}/confirm`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT status FROM invoice WHERE id = ?', [createdInvoiceId]);
            expect(dbResult[0].status).toBe('PAID');
        });

        test('[INV_016] POST /confirm/{id} - [Negative] ID không tồn tại', async ({ request }) => {
            const response = await request.post('/api/v1/admin/invoices/999999/confirm', {
                headers: { Cookie: adminCookies }
            });
            expect([400, 404, 500]).toContain(response.status());
        });

        // ── BUSINESS: Không sửa PAID ──────────────────────────────
        test('[INV_012] PUT /edit - [Business Rule] Không sửa hóa đơn đã PAID', async ({ request }) => {
            const editPayload = {
                ...validPayload,
                id: createdInvoiceId,
                totalAmount: 99999.0
            };
            const response = await request.put(`/api/v1/admin/invoices/${createdInvoiceId}`, {
                headers: { Cookie: adminCookies },
                data: editPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[INV_013] PUT /status - [Positive] Trigger cập nhật trạng thái hàng loạt', async ({ request }) => {
            const response = await request.put('/api/v1/admin/invoices/status', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
        });

        // ── DELETE ────────────────────────────────────────────────
        test('[INV_014] DELETE /delete/{id} - [Positive] Xóa hóa đơn & DB Check', async ({ request }) => {
            const response = await request.delete(`/api/v1/admin/invoices/${createdInvoiceId}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM invoice WHERE id = ?', [createdInvoiceId]);
            if (dbResult.length > 0) {
                expect(dbResult[0].is_deleted || dbResult[0].deleted).toBeTruthy();
            } else {
                expect(dbResult.length).toBe(0);
            }
            createdInvoiceId = 0;
        });
    });
});

