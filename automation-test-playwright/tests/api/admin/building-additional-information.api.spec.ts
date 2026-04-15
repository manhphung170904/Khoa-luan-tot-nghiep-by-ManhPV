import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Admin Building Additional Information API', () => {
    let db: DatabaseHelper;
    let adminCookies: string;
    let buildingId: number;

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();

        // Lấy 1 building ID thực tế từ DB
        const buildings = await db.query('SELECT id FROM building ORDER BY id LIMIT 1');
        buildingId = buildings.length > 0 ? buildings[0].id : 1;
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    // ═══════════════════════════════════════════════════════════════
    //  LEGAL AUTHORITY CRUD (Serial)
    // ═══════════════════════════════════════════════════════════════
    test.describe.serial('CRUD API cho Legal Authority', () => {
        let createdLegalAuthorityId: number;

        // ── SECURITY ──────────────────────────────────────────────
        test('[BAI_LA_SEC] POST /legal-authority - [Security] Reject thiếu Token', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/legal-authority', {
                data: { buildingId, authorityName: 'Test Security', authorityType: 'NOTARY' }
            });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        // ── NEGATIVE ──────────────────────────────────────────────
        test('[BAI_LA_NEG] POST /legal-authority - [Negative] Thiếu buildingId', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/legal-authority', {
                headers: { Cookie: adminCookies },
                data: { authorityName: 'Test Missing Building ID', authorityType: 'NOTARY' }
            });
            expect([400, 500]).toContain(response.status());
        });

        test('[BAI_LA_BND] POST /legal-authority - [Boundary] Tên > 255 ký tự', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/legal-authority', {
                headers: { Cookie: adminCookies },
                data: { buildingId, authorityName: 'A'.repeat(300), authorityType: 'NOTARY' }
            });
            expect([400, 500]).toContain(response.status());
        });

        // ── POSITIVE: Create ──────────────────────────────────────
        test('[BAI_LA_C] POST /legal-authority - [Positive] Create & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                authorityName: 'Văn phòng công chứng Auto',
                authorityType: 'NOTARY',
                address: '123 Đường B, Quận C',
                phone: '0123456789',
                email: 'contact@notary-auto.com',
                note: 'Auto test'
            };

            const response = await request.post('/admin/building-additional-information/legal-authority', {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('id');
            expect(data.authorityName).toBe(payload.authorityName);

            createdLegalAuthorityId = data.id;

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM legal_authority WHERE id = ?', [createdLegalAuthorityId]);
            expect(dbResult.length).toBe(1);
            expect(dbResult[0].authority_name).toBe(payload.authorityName);
            expect(dbResult[0].email).toBe(payload.email);
            expect(dbResult[0].building_id).toBe(buildingId);
        });

        // ── POSITIVE: Read ────────────────────────────────────────
        test('[BAI_LA_R] GET /legal-authority/{buildingId}/list - [Positive] Read', async ({ request }) => {
            const response = await request.get(`/admin/building-additional-information/legal-authority/${buildingId}/list`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const list = await response.json();
            expect(Array.isArray(list)).toBeTruthy();
            const found = list.find((item: any) => item.id === createdLegalAuthorityId);
            expect(found).toBeDefined();
            expect(found.authorityName).toBe('Văn phòng công chứng Auto');
        });

        // ── POSITIVE: Update ──────────────────────────────────────
        test('[BAI_LA_U] PUT /legal-authority/{id} - [Positive] Update & DB Check', async ({ request }) => {
            const updatePayload = {
                buildingId,
                authorityName: 'VP Công Chứng - UPDATED',
                authorityType: 'LAW_FIRM',
                address: '456 Đường D',
                phone: '0987654321',
                email: 'updated@notary.com',
                note: 'Updated'
            };

            const response = await request.put(`/admin/building-additional-information/legal-authority/${createdLegalAuthorityId}`, {
                headers: { Cookie: adminCookies },
                data: updatePayload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM legal_authority WHERE id = ?', [createdLegalAuthorityId]);
            expect(dbResult[0].authority_name).toBe('VP Công Chứng - UPDATED');
            expect(dbResult[0].phone).toBe('0987654321');
            expect(dbResult[0].authority_type).toBe('LAW_FIRM');
        });

        // ── POSITIVE: Delete ──────────────────────────────────────
        test('[BAI_LA_D] DELETE /legal-authority/{id} - [Positive] Delete & DB Check', async ({ request }) => {
            const response = await request.delete(`/admin/building-additional-information/legal-authority/${createdLegalAuthorityId}`, {
                headers: { Cookie: adminCookies }
            });
            expect([200, 204]).toContain(response.status());

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM legal_authority WHERE id = ?', [createdLegalAuthorityId]);
            expect(dbResult.length).toBe(0);
            createdLegalAuthorityId = 0;
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  NEARBY AMENITY CRUD (Serial)
    // ═══════════════════════════════════════════════════════════════
    test.describe.serial('CRUD API cho Nearby Amenity', () => {
        let createdAmenityId: number;

        test('[BAI_NA_SEC] POST /nearby-amenity - [Security] Reject thiếu Token', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/nearby-amenity', {
                data: { buildingId, name: 'Test Security', amenityType: 'PARK' }
            });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        test('[BAI_NA_C] POST /nearby-amenity - [Positive] Create & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                name: 'Công viên Auto Test',
                amenityType: 'PARK',
                distanceMeter: 500,
                address: '123 Đường Test',
                latitude: 10.762,
                longitude: 106.660
            };
            const response = await request.post('/admin/building-additional-information/nearby-amenity', {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            createdAmenityId = data.id;

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM nearby_amenity WHERE id = ?', [createdAmenityId]);
            expect(dbResult.length).toBe(1);
            expect(dbResult[0].name).toBe(payload.name);
        });

        test('[BAI_NA_R] GET /nearby-amenity/{buildingId}/list - [Positive] Read', async ({ request }) => {
            const response = await request.get(`/admin/building-additional-information/nearby-amenity/${buildingId}/list`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const list = await response.json();
            expect(list.some((i: any) => i.id === createdAmenityId)).toBeTruthy();
        });

        test('[BAI_NA_U] PUT /nearby-amenity/{id} - [Positive] Update & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                name: 'Công viên UPDATED',
                amenityType: 'PARK',
                distanceMeter: 600,
                address: '456 Đường Update',
                latitude: 10.763,
                longitude: 106.661
            };
            const response = await request.put(`/admin/building-additional-information/nearby-amenity/${createdAmenityId}`, {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT name, distance_meter FROM nearby_amenity WHERE id = ?', [createdAmenityId]);
            expect(dbResult[0].name).toBe('Công viên UPDATED');
            expect(dbResult[0].distance_meter).toBe(600);
        });

        test('[BAI_NA_D] DELETE /nearby-amenity/{id} - [Positive] Delete', async ({ request }) => {
            const response = await request.delete(`/admin/building-additional-information/nearby-amenity/${createdAmenityId}`, {
                headers: { Cookie: adminCookies }
            });
            expect([200, 204]).toContain(response.status());

            const dbResult = await db.query('SELECT * FROM nearby_amenity WHERE id = ?', [createdAmenityId]);
            expect(dbResult.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  SUPPLIER CRUD (Serial)
    // ═══════════════════════════════════════════════════════════════
    test.describe.serial('CRUD API cho Supplier', () => {
        let createdSupplierId: number;

        test('[BAI_SP_SEC] POST /supplier - [Security] Reject thiếu Token', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/supplier', {
                data: { buildingId, name: 'Test', serviceType: 'CLEANING' }
            });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        test('[BAI_SP_C] POST /supplier - [Positive] Create & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                name: 'Cty TNHH Vệ Sinh Auto',
                serviceType: 'CLEANING',
                phone: '0901234567',
                email: 'clean@auto.com',
                address: '1A Đường Test',
                note: 'Auto test'
            };
            const response = await request.post('/admin/building-additional-information/supplier', {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            createdSupplierId = data.id;

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM supplier WHERE id = ?', [createdSupplierId]);
            expect(dbResult.length).toBe(1);
            expect(dbResult[0].name).toBe(payload.name);
        });

        test('[BAI_SP_R] GET /supplier/{buildingId}/list - [Positive] Read', async ({ request }) => {
            const response = await request.get(`/admin/building-additional-information/supplier/${buildingId}/list`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const list = await response.json();
            expect(list.some((i: any) => i.id === createdSupplierId)).toBeTruthy();
        });

        test('[BAI_SP_U] PUT /supplier/{id} - [Positive] Update & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                name: 'Cty Vệ Sinh VIP UPDATED',
                serviceType: 'CLEANING',
                phone: '0909999999',
                email: 'vip@auto.com',
                address: '2B Đường Update',
                note: 'Updated'
            };
            const response = await request.put(`/admin/building-additional-information/supplier/${createdSupplierId}`, {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT name FROM supplier WHERE id = ?', [createdSupplierId]);
            expect(dbResult[0].name).toBe('Cty Vệ Sinh VIP UPDATED');
        });

        test('[BAI_SP_D] DELETE /supplier/{id} - [Positive] Delete', async ({ request }) => {
            const response = await request.delete(`/admin/building-additional-information/supplier/${createdSupplierId}`, {
                headers: { Cookie: adminCookies }
            });
            expect([200, 204]).toContain(response.status());

            const dbResult = await db.query('SELECT * FROM supplier WHERE id = ?', [createdSupplierId]);
            expect(dbResult.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  PLANNING MAP CRUD (Serial)
    // ═══════════════════════════════════════════════════════════════
    test.describe.serial('CRUD API cho Planning Map', () => {
        let createdMapId: number;

        test('[BAI_PM_SEC] POST /planning-map - [Security] Reject thiếu Token', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/planning-map', {
                data: { buildingId, mapType: 'Quy hoạch', issuedBy: 'Test' }
            });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        test('[BAI_PM_C] POST /planning-map - [Positive] Create & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                mapType: 'Quy hoạch 1/500 Auto',
                issuedBy: 'Sở Xây Dựng',
                issuedDate: '2025-01-01',
                expiredDate: '2030-01-01',
                imageUrl: 'planning_auto.jpg',
                note: 'Auto test'
            };
            const response = await request.post('/admin/building-additional-information/planning-map', {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            createdMapId = data.id;

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT * FROM planning_map WHERE id = ?', [createdMapId]);
            expect(dbResult.length).toBe(1);
            expect(dbResult[0].map_type).toBe(payload.mapType);
        });

        test('[BAI_PM_R] GET /planning-map/{buildingId}/list - [Positive] Read', async ({ request }) => {
            const response = await request.get(`/admin/building-additional-information/planning-map/${buildingId}/list`, {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const list = await response.json();
            expect(list.some((i: any) => i.id === createdMapId)).toBeTruthy();
        });

        test('[BAI_PM_U] PUT /planning-map/{id} - [Positive] Update & DB Check', async ({ request }) => {
            const payload = {
                buildingId,
                mapType: 'Quy hoạch UPDATED',
                issuedBy: 'Sở Xây Dựng',
                issuedDate: '2025-01-01',
                expiredDate: '2030-01-01',
                imageUrl: 'planning_auto.jpg',
                note: 'Updated'
            };
            const response = await request.put(`/admin/building-additional-information/planning-map/${createdMapId}`, {
                headers: { Cookie: adminCookies },
                data: payload
            });
            expect(response.status()).toBe(200);

            // ── DB VALIDATION ──
            const dbResult = await db.query('SELECT map_type FROM planning_map WHERE id = ?', [createdMapId]);
            expect(dbResult[0].map_type).toBe('Quy hoạch UPDATED');
        });

        test('[BAI_PM_D] DELETE /planning-map/{id} - [Positive] Delete', async ({ request }) => {
            const response = await request.delete(`/admin/building-additional-information/planning-map/${createdMapId}`, {
                headers: { Cookie: adminCookies }
            });
            expect([200, 204]).toContain(response.status());

            const dbResult = await db.query('SELECT * FROM planning_map WHERE id = ?', [createdMapId]);
            expect(dbResult.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //  UPLOAD IMAGE (Planning Map)
    // ═══════════════════════════════════════════════════════════════
    test.describe('Upload Image API cho Planning Map', () => {

        test('[BAI_UP_SEC] POST /planning-map/upload-image - [Security] Reject thiếu Token', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/planning-map/upload-image', {
                multipart: {
                    file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') }
                }
            });
            expect([200, 302, 401, 403]).toContain(response.status());
        });

        test('[BAI_UP_NEG] POST /planning-map/upload-image - [Negative] Sai định dạng (text/plain)', async ({ request }) => {
            const response = await request.post('/admin/building-additional-information/planning-map/upload-image', {
                headers: { Cookie: adminCookies },
                multipart: {
                    file: { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') }
                }
            });
            expect(response.status()).toBe(400);
            const data = await response.json();
            expect(data.message).toContain('Định dạng không hợp lệ');
        });

        test('[BAI_UP_BND] POST /planning-map/upload-image - [Boundary] File > 5MB', async ({ request }) => {
            const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024, 'a');
            const response = await request.post('/admin/building-additional-information/planning-map/upload-image', {
                headers: { Cookie: adminCookies },
                multipart: {
                    file: { name: 'large.jpg', mimeType: 'image/jpeg', buffer: largeBuffer }
                }
            });
            expect([400, 500]).toContain(response.status());
        });

        test('[BAI_UP_POS] POST /planning-map/upload-image - [Positive] Upload JPG hợp lệ', async ({ request }) => {
            const buffer = Buffer.from('fake valid image binary');
            const response = await request.post('/admin/building-additional-information/planning-map/upload-image', {
                headers: { Cookie: adminCookies },
                multipart: {
                    file: { name: 'my_map.jpg', mimeType: 'image/jpeg', buffer }
                }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.filename).toBeDefined();
            expect(data.filename).toContain('planning_');
            expect(data.filename).toMatch(/\.jpg$/);
        });
    });
});
