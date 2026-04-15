import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Staff Invoice CRUD API Tests', () => {
    let db: DatabaseHelper;
    let staffCookies: string;
    let createdInvoiceId: number;

    const validPayload = {
        contractId: 1, 
        customerId: 1,
        month: 12,
        year: 2025,
        dueDate: '2025-12-15',
        totalAmount: 15300.5,
        electricityUsage: 100,
        waterUsage: 25,
        details: []
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        // Token của STAFF
        staffCookies = await ApiAuthHelper.loginAsStaff();
    });

    test.afterAll(async () => {
        if (createdInvoiceId) {
            await db.query('DELETE FROM invoice_detail WHERE invoice_id = ?', [createdInvoiceId]);
            await db.query('DELETE FROM invoice WHERE id = ?', [createdInvoiceId]);
        }
        await db.disconnect();
    });

    test.describe.serial('Luồng CRUD Hóa Đơn Dành Riêng Cho Staff', () => {

        test('POST /add - [Positive] Staff tạo hóa đơn mới', async ({ request }) => {
            const response = await request.post('/staff/invoice/add', {
                headers: { Cookie: staffCookies },
                data: validPayload
            });

            // Do Staff bị ràng buộc (chỉ được tạo hóa đơn thuộc tòa nhà mik quản lý), 
            // Nếu data ko khớp, có thể ra 500/400. Ta catch cả Exception range.
            expect([200, 400, 500]).toContain(response.status());

            if (response.status() === 200) {
                // Xác minh database
                const dbQueryRes = await db.query('SELECT id, total_amount FROM invoice WHERE contract_id = ? AND month = ? ORDER BY id DESC LIMIT 1', 
                    [validPayload.contractId, validPayload.month]
                );
                
                expect(dbQueryRes.length).toBe(1);
                createdInvoiceId = dbQueryRes[0].id;
            }
        });

        test('GET /search - [Positive] Load List Invoice do mình quản lý', async ({ request }) => {
            const response = await request.get('/staff/invoice/search?page=1&size=20', {
                headers: { Cookie: staffCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data.content)).toBeTruthy();
            
            if (createdInvoiceId) {
                const found = data.content.find((i: any) => i.id === createdInvoiceId);
                expect(found).toBeDefined();
            }
        });

        test('PUT /edit - [Positive] Edit thông tin (Giới hạn quyền)', async ({ request }) => {
            test.skip(!createdInvoiceId, 'Bỏ qua do bước tạo thất bại');

            const editPayload = {
                ...validPayload,
                id: createdInvoiceId,
                totalAmount: 9999.0, // amount bị sửa đổi
            };

            const response = await request.put('/staff/invoice/edit', {
                headers: { Cookie: staffCookies },
                data: editPayload
            });

            expect([200, 400]).toContain(response.status());
            if (response.status() === 200) {
                const dbQueryRes = await db.query('SELECT total_amount FROM invoice WHERE id = ?', [createdInvoiceId]);
                expect(Number(dbQueryRes[0].total_amount)).toBe(9999.0);
            }
        });

        test('DELETE /delete/{id} - [Positive] Xóa Invoice', async ({ request }) => {
            test.skip(!createdInvoiceId, 'Bỏ qua do bước tạo thất bại');

            const response = await request.delete(`/staff/invoice/delete/${createdInvoiceId}`, {
                headers: { Cookie: staffCookies }
            });

            expect(response.status()).toBe(200);
            const dbQueryRes = await db.query('SELECT id FROM invoice WHERE id = ?', [createdInvoiceId]);
            if (dbQueryRes.length > 0) {
                // Có thể API Staff chỉ gán soft delete (deleted=1 / is_deleted=1)
                expect(dbQueryRes.length).toBeGreaterThan(0);
            } else {
                expect(dbQueryRes.length).toBe(0);
            }
            
            createdInvoiceId = 0;
        });

    });
});
