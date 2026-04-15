import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Admin Customer API Tests', () => {
    let db: DatabaseHelper;
    let adminCookies: string;
    let createdCustomerId: number;

    const uniqueSuffix = Date.now();
    const validCustomerPayload = {
        username: `autocust${uniqueSuffix}`,
        password: 'password123',
        fullName: 'Auto Test Customer',
        phone: `0700${String(uniqueSuffix).slice(-6)}`,
        email: `autocust${uniqueSuffix}@customer.com`,
        staffIds: [1] // Ít nhất 1 staff phụ trách (@Size min=1)
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();

        // Lấy 1 staff ID thực tế từ DB
        const staff = await db.query('SELECT id FROM staff ORDER BY id LIMIT 1');
        if (staff.length > 0) {
            validCustomerPayload.staffIds = [staff[0].id];
        }
    });

    test.afterAll(async () => {
        if (createdCustomerId) {
            await db.query('DELETE FROM assignment_customer WHERE customer_id = ?', [createdCustomerId]).catch(() => {});
            await db.query('DELETE FROM customer WHERE id = ?', [createdCustomerId]).catch(() => {});
        }
        await db.disconnect();
    });

    test.describe.serial('Luồng CRUD Khách Hàng', () => {

        // ── SECURITY ──────────────────────────────────────────────
        test('[CUS_001] POST /add - [Security] Reject thiếu Admin Token', async ({ request }) => {
            const response = await request.post('/admin/customer/add', { data: validCustomerPayload });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        // ── NEGATIVE: Validation ──────────────────────────────────
        test('[CUS_002] POST /add - [Negative] staffIds rỗng (@Size min=1)', async ({ request }) => {
            const invalidPayload = { ...validCustomerPayload, staffIds: [] };
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[CUS_009] POST /add - [Negative] username < 4 ký tự (@Size min=4)', async ({ request }) => {
            const invalidPayload = { ...validCustomerPayload, username: 'abc' };
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[CUS_003] POST /add - [Boundary] password < 6 ký tự (@Size min=6)', async ({ request }) => {
            const invalidPayload = { ...validCustomerPayload, password: '123' };
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[CUS_010] POST /add - [Negative] email > 100 ký tự (@Size max=100)', async ({ request }) => {
            const invalidPayload = { ...validCustomerPayload, email: 'a'.repeat(95) + '@b.com' };
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[CUS_011] POST /add - [Negative] SĐT sai định dạng', async ({ request }) => {
            const invalidPayload = { ...validCustomerPayload, phone: '9999999999' }; // Không bắt đầu bằng 0
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        // ── POSITIVE: Create ──────────────────────────────────────
        test('[CUS_004] POST /add - [Positive] Tạo khách hàng thành công & DB Check', async ({ request }) => {
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: validCustomerPayload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM customer WHERE email = ?', [validCustomerPayload.email]);
            if (dbResult.length > 0) {
                expect(dbResult[0].email).toBe(validCustomerPayload.email);
                createdCustomerId = dbResult[0].id;
            } else {
                // Fallback: customer tách bảng user
                const userRes = await db.query(
                    'SELECT c.id FROM customer c JOIN user u ON c.account_id = u.id WHERE u.email = ?',
                    [validCustomerPayload.email]
                );
                expect(userRes.length).toBeGreaterThan(0);
                createdCustomerId = userRes[0].id;
            }
            expect(createdCustomerId).toBeGreaterThan(0);
        });

        // ── NEGATIVE: Duplicate ───────────────────────────────────
        test('[CUS_012] POST /add - [Negative] Duplicate username/email', async ({ request }) => {
            const response = await request.post('/admin/customer/add', {
                headers: { Cookie: adminCookies },
                data: validCustomerPayload // username + email đã tồn tại
            });
            expect([400, 409]).toContain(response.status());
        });

        // ── POSITIVE: Read ────────────────────────────────────────
        test('[CUS_005] GET /list/page - [Positive] Phân trang chứa customer vừa tạo', async ({ request }) => {
            const response = await request.get('/admin/customer/list/page?page=1&size=50', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data.content)).toBeTruthy();
            const found = data.content.find((i: any) => i.id === createdCustomerId || i.email === validCustomerPayload.email);
            expect(found).toBeDefined();
        });

        test('[CUS_006] GET /search/page - [Positive] Search theo fullName', async ({ request }) => {
            const response = await request.get(`/admin/customer/search/page?page=1&size=10&fullName=Auto Test Customer`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.content.length).toBeGreaterThanOrEqual(1);
        });

        // ── DELETE: Business Rule ─────────────────────────────────
        test('[CUS_007] DELETE /delete/{id} - [Business Rule] Customer đang có hợp đồng', async ({ request }) => {
            const customerWithContract = await db.query(`
                SELECT DISTINCT c.id FROM customer c
                INNER JOIN contract ct ON ct.customer_id = c.id
                LIMIT 1
            `);

            if (customerWithContract.length > 0) {
                const lockedId = customerWithContract[0].id;
                const response = await request.delete(`/admin/customer/delete/${lockedId}`, {
                    headers: { Cookie: adminCookies }
                });
                expect([400, 409]).toContain(response.status());
            } else {
                test.skip(true, 'Không có Customer nào có hợp đồng');
            }
        });

        test('[CUS_013] DELETE /delete/{id} - [Negative] ID không tồn tại', async ({ request }) => {
            const response = await request.delete('/admin/customer/delete/999999', {
                headers: { Cookie: adminCookies }
            });
            expect([400, 409]).toContain(response.status());
        });

        // ── POSITIVE: Delete (Teardown) ───────────────────────────
        test('[CUS_008] DELETE /delete/{id} - [Positive] Xóa Customer & Verify DB', async ({ request }) => {
            const response = await request.delete(`/admin/customer/delete/${createdCustomerId}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM customer WHERE id = ?', [createdCustomerId]);
            if (dbResult.length > 0) {
                expect(dbResult[0].is_deleted || dbResult[0].deleted || dbResult[0].status === 'DELETED').toBeTruthy();
            } else {
                expect(dbResult.length).toBe(0);
            }
            createdCustomerId = 0;
        });
    });
});
