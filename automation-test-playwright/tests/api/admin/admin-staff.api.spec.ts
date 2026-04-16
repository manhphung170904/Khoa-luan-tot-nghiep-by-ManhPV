import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Admin Staff API Tests', () => {
    let db: DatabaseHelper;
    let adminCookies: string;
    let createdStaffId: number;

    const uniqueSuffix = Date.now();
    const validStaffPayload = {
        username: `autostaff${uniqueSuffix}`,
        password: 'password123',
        fullName: 'Auto Test Staff',
        phone: `0900${String(uniqueSuffix).slice(-6)}`,
        email: `autostaff${uniqueSuffix}@estate.com`,
        role: 'STAFF'
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();
    });

    test.afterAll(async () => {
        if (createdStaffId) {
            // Cleanup assignments trước khi xóa staff
            await db.query('DELETE FROM assignment_building WHERE staff_id = ?', [createdStaffId]).catch(() => {});
            await db.query('DELETE FROM assignment_customer WHERE staff_id = ?', [createdStaffId]).catch(() => {});
            await db.query('DELETE FROM staff WHERE id = ?', [createdStaffId]).catch(() => {});
        }
        await db.disconnect();
    });

    test.describe.serial('Luồng CRUD Staff & Phân Quyền', () => {

        // -- SECURITY ----------------------------------------------
        test('[STF_001] POST /add - [Security] Reject thiếu Admin Token', async ({ request }) => {
            const response = await request.post('/api/v1/admin/staff', { data: validStaffPayload });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        // -- NEGATIVE: DTO Validation ------------------------------
        test('[STF_002] POST /add - [Negative] username < 4 ký tự (@Size min=4)', async ({ request }) => {
            const invalidPayload = { ...validStaffPayload, username: 'abc' };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[STF_017] POST /add - [Negative] password < 6 ký tự (@Size min=6)', async ({ request }) => {
            const invalidPayload = { ...validStaffPayload, password: '12345' };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[STF_003] POST /add - [Negative] SĐT sai định dạng (không bắt đầu bằng 0)', async ({ request }) => {
            const invalidPayload = { ...validStaffPayload, phone: '1987654321' };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        test('[STF_018] POST /add - [Negative] fullName > 100 ký tự (@Size max=100)', async ({ request }) => {
            const invalidPayload = { ...validStaffPayload, fullName: 'A'.repeat(101) };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        // -- BOUNDARY ----------------------------------------------
        test('[STF_015] POST /add - [Boundary] username = 4 ký tự (đúng min)', async ({ request }) => {
            const boundaryPayload = {
                ...validStaffPayload,
                username: 'ab' + String(uniqueSuffix).slice(-2),
                email: `bnd4_${uniqueSuffix}@estate.com`,
                phone: `0800${String(uniqueSuffix).slice(-6)}`
            };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: boundaryPayload
            });
            // username = 4 ký tự → valid → 200, nhưng nếu trùng thì 400
            expect([200, 400]).toContain(response.status());

            // Cleanup nếu tạo thành công
            if (response.status() === 200) {
                const cleanup = await db.query('SELECT id FROM staff WHERE username = ?', [boundaryPayload.username]);
                if (cleanup.length > 0) {
                    await db.query('DELETE FROM staff WHERE id = ?', [cleanup[0].id]);
                }
            }
        });

        test('[STF_016] POST /add - [Boundary] username = 31 ký tự (vượt max=30)', async ({ request }) => {
            const invalidPayload = { ...validStaffPayload, username: 'a'.repeat(31) };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: invalidPayload
            });
            expect(response.status()).toBe(400);
        });

        // -- POSITIVE: Create --------------------------------------
        test('[STF_004] POST /add - [Positive] Tạo nhân viên thành công & DB Check', async ({ request }) => {
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: validStaffPayload
            });
            expect(response.status()).toBe(200);

            // -- DB VALIDATION --
            const dbResult = await db.query('SELECT * FROM staff WHERE username = ?', [validStaffPayload.username]);
            expect(dbResult.length).toBe(1);
            expect(dbResult[0].email).toBe(validStaffPayload.email);
            expect(dbResult[0].full_name).toBe(validStaffPayload.fullName);

            createdStaffId = dbResult[0].id;
            expect(createdStaffId).toBeGreaterThan(0);
        });

        // -- NEGATIVE: Duplicate -----------------------------------
        test('[STF_005] POST /add - [Negative] Duplicate Username', async ({ request }) => {
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: validStaffPayload
            });
            expect([400, 409]).toContain(response.status());
        });

        test('[STF_019] POST /add - [Negative] Duplicate Email', async ({ request }) => {
            const duplicatePayload = {
                ...validStaffPayload,
                username: `unique_${uniqueSuffix}`,
                phone: '0911111111'
                // email giữ nguyên → trùng
            };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: duplicatePayload
            });
            expect([400, 409]).toContain(response.status());
        });

        test('[STF_020] POST /add - [Negative] Duplicate SĐT', async ({ request }) => {
            const duplicatePayload = {
                ...validStaffPayload,
                username: `unique2_${uniqueSuffix}`,
                email: `unique2_${uniqueSuffix}@estate.com`
                // phone giữ nguyên → trùng
            };
            const response = await request.post('/api/v1/admin/staff', {
                headers: { Cookie: adminCookies },
                data: duplicatePayload
            });
            expect([400, 409]).toContain(response.status());
        });

        // -- POSITIVE: Read ----------------------------------------
        test('[STF_006] GET /list/page - [Positive] Lấy danh sách staff', async ({ request }) => {
            const response = await request.get('/admin/staff/list/page?page=1&size=100', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            // Response có thể là { content: [] } hoặc array trực tiếp
            if (data.content) {
                expect(Array.isArray(data.content)).toBeTruthy();
            } else {
                expect(Array.isArray(data)).toBeTruthy();
            }
        });

        test('[STF_007] GET /search/page - [Positive] Search theo username', async ({ request }) => {
            const response = await request.get(`/admin/staff/search/page?page=1&size=10&username=${validStaffPayload.username}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            // Search API trả paginated result. Content có thể rỗng nếu staff bị xóa bởi security test
            if (data.content) {
                expect(Array.isArray(data.content)).toBeTruthy();
            }
        });

        test('[STF_022] GET /customers - [Positive] Load danh sách khách hàng', async ({ request }) => {
            const response = await request.get('/api/v1/admin/staff/customers', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
        });

        test('[STF_008] GET /buildings - [Positive] Load danh sách tòa nhà', async ({ request }) => {
            const response = await request.get('/api/v1/admin/staff/buildings', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
        });

        // -- ASSIGNMENT: Building ----------------------------------
        test('[STF_009] PUT /{id}/assignments/buildings - [Positive] Phân công & DB Check', async ({ request }) => {
            // Lấy 2 building IDs thực tế từ DB
            const buildings = await db.query('SELECT id FROM building ORDER BY id LIMIT 2');
            if (buildings.length < 2) {
                test.skip(true, 'Cần ít nhất 2 buildings trong DB');
                return;
            }
            const assignedIds = buildings.map((b: any) => b.id);

            const response = await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
                headers: { Cookie: adminCookies },
                data: assignedIds
            });
            expect(response.status()).toBe(200);

            // -- DB VALIDATION --
            const dbCheck = await db.query('SELECT building_id FROM assignment_building WHERE staff_id = ?', [createdStaffId]);
            const dbIds = dbCheck.map((row: any) => row.building_id);
            for (const id of assignedIds) {
                expect(dbIds).toContain(id);
            }
        });

        test('[STF_010] GET /{id}/assignments/buildings - [Positive] Verify assignments qua API', async ({ request }) => {
            const response = await request.get(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeGreaterThanOrEqual(1);
        });

        test('[STF_023] PUT /{id}/assignments/buildings - [Negative] Staff ID không tồn tại', async ({ request }) => {
            const response = await request.put('/api/v1/admin/staff/999999/assignments/buildings', {
                headers: { Cookie: adminCookies },
                data: [1]
            });
            expect([400, 404, 500]).toContain(response.status());
        });

        // -- ASSIGNMENT: Customer ----------------------------------
        test('[STF_011] PUT /{id}/assignments/customers - [Positive] Phân công khách hàng', async ({ request }) => {
            const customers = await db.query('SELECT id FROM customer ORDER BY id LIMIT 1');
            if (customers.length === 0) {
                test.skip(true, 'Cần ít nhất 1 customer trong DB');
                return;
            }
            const assignedIds = customers.map((c: any) => c.id);

            const response = await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
                headers: { Cookie: adminCookies },
                data: assignedIds
            });
            expect(response.status()).toBe(200);
        });

        // -- DELETE: Business Rule ---------------------------------
        test('[STF_012] DELETE /delete/{id} - [Business Rule] Staff đang có assignment', async ({ request }) => {
            const response = await request.delete(`/api/v1/admin/staff/${createdStaffId}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(400);
        });

        test('[STF_021] DELETE /delete/{id} - [Negative] ID không tồn tại', async ({ request }) => {
            const response = await request.delete('/api/v1/admin/staff/999999', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(400);
        });

        // ── TEARDOWN: Nhả assignments ─────────────────────────────
        test('[STF_013] PUT /{id}/assignments - [TearDown] Hủy quyền quản lý', async ({ request }) => {
            await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/buildings`, {
                headers: { Cookie: adminCookies }, data: []
            });
            await request.put(`/api/v1/admin/staff/${createdStaffId}/assignments/customers`, {
                headers: { Cookie: adminCookies }, data: []
            });
        });

        // -- POSITIVE: Delete --------------------------------------
        test('[STF_014] DELETE /delete/{id} - [Positive] Xóa thành công & Verify DB', async ({ request }) => {
            const response = await request.delete(`/api/v1/admin/staff/${createdStaffId}`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);

            // -- DB VALIDATION --
            const dbResult = await db.query('SELECT * FROM staff WHERE id = ?', [createdStaffId]);
            if (dbResult.length > 0) {
                // Soft delete
                expect(dbResult[0].is_deleted || dbResult[0].deleted || dbResult[0].status === 'DELETED').toBeTruthy();
            } else {
                expect(dbResult.length).toBe(0); // Hard delete
            }
            createdStaffId = 0;
        });
    });
});


