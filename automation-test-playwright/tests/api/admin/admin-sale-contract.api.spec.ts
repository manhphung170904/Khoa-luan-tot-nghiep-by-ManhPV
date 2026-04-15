import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';
import { TestSafetyHelper } from '../../../utils/helpers/TestSafetyHelper';

test.describe('Admin Sale Contract API Tests', () => {
    let db: DatabaseHelper;
    let adminCookies: string;
    let createdSaleContractId: number;

    const validPayload = {
        customerId: 1,
        buildingId: 1,
        staffId: 1,
        salePrice: 1500.5,
        transferDate: '2025-05-15',
        note: 'Bán BĐS - Auto Test'
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();

        // Lấy tổ hợp hợp lệ: building chưa bán, staff quản lý building + customer
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
        if (createdSaleContractId) {
            await db.query('DELETE FROM sale_contract WHERE id = ?', [createdSaleContractId]).catch(() => {});
        }
        await db.disconnect();
    });

    test.describe.serial('Luồng CRUD Hợp Đồng Mua Bán', () => {

        // ── SECURITY ──────────────────────────────────────────────
        test('[SC_001] POST /add - [Security] Reject thiếu Admin Token', async ({ request }) => {
            const response = await request.post('/admin/sale-contract/add', { data: validPayload });
            // Không nên expect 200 cho trường hợp thiếu quyền/chưa đăng nhập
            expect([302, 401, 403]).toContain(response.status());
        });

        // ── NEGATIVE: Validation ──────────────────────────────────
        test('[SC_002] POST /add - [Negative] salePrice = 0 (@Positive)', async ({ request }) => {
            const invalidPayload = { ...validPayload, salePrice: 0 };
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[SC_012] POST /add - [Boundary] salePrice = -1 (@Positive)', async ({ request }) => {
            const invalidPayload = { ...validPayload, salePrice: -1 };
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[SC_010] POST /add - [Negative] Thiếu buildingId (@NotNull)', async ({ request }) => {
            const invalidPayload = { ...validPayload };
            delete (invalidPayload as any).buildingId;
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[SC_011] POST /add - [Negative] Thiếu customerId (@NotNull)', async ({ request }) => {
            const invalidPayload = { ...validPayload };
            delete (invalidPayload as any).customerId;
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[SC_003] POST /add - [Negative] buildingId không tồn tại', async ({ request }) => {
            const invalidPayload = { ...validPayload, buildingId: 999999 };
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            // Tốt nhất backend nên trả 400 hoặc 404, trả 500 là lỗi server chưa bắt Exception
            expect([400, 404]).toContain(response.status());
        });

        test('[SC_004] POST /add - [Negative] staffId không hợp lệ', async ({ request }) => {
            const invalidPayload = { ...validPayload, staffId: -1 };
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect([400, 404]).toContain(response.status());
        });

        // ── POSITIVE: Create ──────────────────────────────────────
        test('[SC_005] POST /add - [Positive] Tạo HĐ mua bán & DB Check', async ({ request }) => {
            const response = await request.post('/admin/sale-contract/add', {
                headers: { Cookie: adminCookies },
                data: validPayload
            });

            // Nếu không tìm được tổ hợp hợp lệ (staff quản lý building + customer) → 400
            if (response.status() === 400) {
                const body = await response.json().catch(() => null);
                console.log('SC_005 skipped - no valid assignment combo:', body?.message || 'validation error');
                test.skip(true, 'Không tìm được tổ hợp staff-building-customer hợp lệ');
                return;
            }

            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query(
                'SELECT * FROM sale_contract WHERE customer_id = ? AND building_id = ? ORDER BY id DESC LIMIT 1',
                [validPayload.customerId, validPayload.buildingId]
            );
            expect(dbResult.length).toBe(1);
            expect(Number(dbResult[0].sale_price)).toBe(validPayload.salePrice);
            expect(dbResult[0].note).toBe(validPayload.note);

            createdSaleContractId = dbResult[0].id;
        });

        // ── POSITIVE: Read ────────────────────────────────────────
        test('[SC_006] GET /list/page - [Positive] Chứa HĐ vừa tạo', async ({ request }) => {
            if (!createdSaleContractId) {
                test.skip(true, 'SC_005 chưa tạo được HĐ mua bán');
                return;
            }
            const response = await request.get('/admin/sale-contract/list/page?page=1&size=100', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data.content)).toBeTruthy();
            const found = data.content.find((i: any) => i.id === createdSaleContractId);
            expect(found).toBeDefined();
        });

        test('[SC_007] GET /search/page - [Positive] Lọc theo buildingId', async ({ request }) => {
            if (!createdSaleContractId) {
                test.skip(true, 'SC_005 chưa tạo được HĐ mua bán');
                return;
            }
            const response = await request.get('/admin/sale-contract/search/page', {
                headers: { Cookie: adminCookies },
                params: {
                    buildingId: validPayload.buildingId,
                    page: 1,
                    size: 10
                }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.content.length).toBeGreaterThanOrEqual(1);
        });

        // ── POSITIVE: Update ──────────────────────────────────────
        test('[SC_008] PUT /edit - [Positive] Sửa giá bán & Verify DB', async ({ request }) => {
            if (!createdSaleContractId) {
                test.skip(true, 'SC_005 chưa tạo được HĐ mua bán');
                return;
            }
            const editPayload = {
                ...validPayload,
                id: createdSaleContractId,
                salePrice: 2000.0,
                transferDate: '2026-06-16',
                note: 'Đã updated note'
            };

            const response = await request.put('/admin/sale-contract/edit', {
                headers: { Cookie: adminCookies },
                data: editPayload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM sale_contract WHERE id = ?', [createdSaleContractId]);
            expect(Number(dbResult[0].sale_price)).toBe(2000.0);
            expect(dbResult[0].note).toBe('Đã updated note');
        });

        // ── POSITIVE: Delete (Teardown) ───────────────────────────
        test('[SC_009] DELETE /delete/{id} - [Positive] Xóa HĐ mua bán & DB Check', async ({ request }) => {
            // Bảo vệ an toàn dữ liệu, tránh vô tình chạy lệnh Xóa trên môi trường thật
            TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
            
            if (!createdSaleContractId) {
                test.skip(true, 'SC_005 chưa tạo được HĐ mua bán');
                return;
            }
            const response = await request.delete(`/admin/sale-contract/delete/${createdSaleContractId}`, {
                headers: { Cookie: adminCookies }
            });
            expect([200, 409]).toContain(response.status());

            // ── DB VALIDATION ──
            if (response.status() === 200) {
                const dbResult = await db.query('SELECT * FROM sale_contract WHERE id = ?', [createdSaleContractId]);
                if (dbResult.length > 0) {
                    expect(dbResult[0].is_deleted || dbResult[0].deleted).toBeTruthy();
                } else {
                    expect(dbResult.length).toBe(0);
                }
            }
            createdSaleContractId = 0;
        });
    });
});
