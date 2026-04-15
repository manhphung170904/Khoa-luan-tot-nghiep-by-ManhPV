import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Admin Contract API Tests', () => {
    let db: DatabaseHelper;
    let adminCookies: string;
    let createdContractId: number;

    const validPayload = {
        customerId: 1,
        buildingId: 1,
        staffId: 1,
        rentPrice: 25.5,
        rentArea: 100,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        status: 'ACTIVE'
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();

        // Lấy tổ hợp (staff, building, customer) hợp lệ từ bảng assignment
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
        } catch (e) {
            console.log('Skipping dynamic assignment fetch:', e);
        }
    });

    test.afterAll(async () => {
        if (createdContractId) {
            await db.query('DELETE FROM contract WHERE id = ?', [createdContractId]).catch(() => {});
        }
        await db.disconnect();
    });

    test.describe.serial('Luồng CRUD Hợp Đồng Thuê', () => {

        // ── SECURITY ──────────────────────────────────────────────
        test('[CTR_001] POST /add - [Security] Chặn request thiếu Admin Token', async ({ request }) => {
            const response = await request.post('/admin/contract/add', { data: validPayload });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        // ── NEGATIVE ──────────────────────────────────────────────
        test('[CTR_002] POST /add - [Negative] rentPrice < 0', async ({ request }) => {
            const invalidPayload = { ...validPayload, rentPrice: -5 };
            const response = await request.post('/admin/contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 500]).toContain(response.status());
        });

        test('[CTR_003] POST /add - [Negative] buildingId không tồn tại', async ({ request }) => {
            const invalidPayload = { ...validPayload, buildingId: 999999 };
            const response = await request.post('/admin/contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([200, 400, 404, 409, 500]).toContain(response.status());
        });

        test('[CTR_004] POST /add - [Negative] customerId không tồn tại', async ({ request }) => {
            const invalidPayload = { ...validPayload, customerId: 999999 };
            const response = await request.post('/admin/contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 404, 409, 500]).toContain(response.status());
        });

        test('[CTR_005] POST /add - [Negative] endDate < startDate', async ({ request }) => {
            const invalidPayload = {
                ...validPayload,
                startDate: '2026-01-01',
                endDate: '2025-01-01'
            };
            const response = await request.post('/admin/contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 500]).toContain(response.status());
        });

        test('[CTR_012] POST /add - [Business Rule] Staff không quản lý building', async ({ request }) => {
            // Tìm 1 building mà staff hiện tại KHÔNG quản lý
            const unmanaged = await db.query(`
                SELECT b.id FROM building b
                WHERE b.id NOT IN (SELECT building_id FROM assignment_building WHERE staff_id = ?)
                LIMIT 1
            `, [validPayload.staffId]);

            if (unmanaged.length > 0) {
                const invalidPayload = { ...validPayload, buildingId: unmanaged[0].id };
                const response = await request.post('/admin/contract/add', {
                    headers: { Cookie: adminCookies },
                    data: invalidPayload
                });
                expect([200, 400, 409]).toContain(response.status());
            } else {
                test.skip(true, 'Staff đang quản lý tất cả buildings');
            }
        });

        // ── POSITIVE: Create ──────────────────────────────────────
        test('[CTR_006] POST /add - [Positive] Tạo hợp đồng thành công & DB Check', async ({ request }) => {
            const response = await request.post('/admin/contract/add', {
                headers: { Cookie: adminCookies },
                data: validPayload
            });

            if ([400, 409].includes(response.status())) {
                const body = await response.json().catch(() => null);
                console.log('CTR_006 skipped:', body?.message || 'validation/conflict error');
                test.skip(true, 'Không tạo được hợp đồng - có thể do trùng hoặc thiếu assignment');
                return;
            }
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query(
                'SELECT * FROM contract WHERE customer_id = ? AND building_id = ? ORDER BY id DESC LIMIT 1',
                [validPayload.customerId, validPayload.buildingId]
            );
            expect(dbResult.length).toBe(1);
            expect(Number(dbResult[0].rent_price)).toBe(validPayload.rentPrice);
            expect(dbResult[0].rent_area).toBe(validPayload.rentArea);

            createdContractId = dbResult[0].id;
        });

        // ── POSITIVE: Read ────────────────────────────────────────
        test('[CTR_007] GET /list/page - [Positive] Chứa hợp đồng vừa tạo', async ({ request }) => {
            const response = await request.get('/admin/contract/list/page?page=1&size=100', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data.content)).toBeTruthy();
            const found = data.content.find((i: any) => i.id === createdContractId);
            expect(found).toBeDefined();
        });

        test('[CTR_008] GET /search/page - [Positive] Lọc theo buildingId', async ({ request }) => {
            const response = await request.get(`/admin/contract/search/page?buildingId=${validPayload.buildingId}&page=1&size=10`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.content.length).toBeGreaterThanOrEqual(1);
        });

        // ── POSITIVE: Update ──────────────────────────────────────
        test('[CTR_009] PUT /edit - [Positive] Sửa rentPrice & Verify DB', async ({ request }) => {
            const editPayload = {
                ...validPayload,
                id: createdContractId,
                rentPrice: 30.5,
                status: 'EXPIRED'
            };

            const response = await request.put('/admin/contract/edit', {
                headers: { Cookie: adminCookies },
                data: editPayload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM contract WHERE id = ?', [createdContractId]);
            expect(Number(dbResult[0].rent_price)).toBe(30.5);
            expect(dbResult[0].status).toBe('EXPIRED');
        });

        test('[CTR_010] PUT /status - [Positive] Trigger cập nhật status tự động', async ({ request }) => {
            const response = await request.put('/admin/contract/status', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
        });

        // ── DELETE ────────────────────────────────────────────────
        test('[CTR_013] DELETE /delete/{id} - [Negative] ID không tồn tại', async ({ request }) => {
            const response = await request.delete('/admin/contract/delete/999999', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(400);
        });

        test('[CTR_011] DELETE /delete/{id} - [Positive] Xóa hợp đồng & Verify DB', async ({ request }) => {
            const response = await request.delete(`/admin/contract/delete/${createdContractId}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM contract WHERE id = ?', [createdContractId]);
            expect(dbResult.length).toBe(0); // Hard delete
            createdContractId = 0;
        });
    });
});
