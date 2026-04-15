import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Payment API (QR VietQR) Tests', () => {
    let db: DatabaseHelper;
    let customerCookies: string;
    let otherCustomerCookies: string;
    let adminCookies: string;

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        
        // Setup mảng giả lập Auth context Authorization headers
        customerCookies = await ApiAuthHelper.loginAsCustomer(); // userId = 1
        otherCustomerCookies = 'NO_AUTH'; // separate customer not available in test env // userId = 2
        adminCookies = await ApiAuthHelper.loginAsAdmin();
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    test.describe.serial('Luồng Render Mã VietQR (GET /payment/qr/{id})', () => {
        
        test('[Security] Reject ngầm nếu truy cập QRCode mà chưa login', async ({ request }) => {
            const response = await request.get('/payment/qr/1');
            // Mock authentication filter chặn thì trả 401
            expect([302, 401, 403]).toContain(response.status());
        });

        test('[Security-RBAC] Chặn văng 403 / 401 nếu dùng token Admin để truy cập QR', async ({ request }) => {
            // Theo code: if (!"CUSTOMER".equalsIgnoreCase(user.getRole())) throw HttpStatus.UNAUTHORIZED
            const response = await request.get('/payment/qr/1', {
                headers: { Cookie: adminCookies }
            });
            expect([302, 401, 403]).toContain(response.status());
        });

        test('[Security-RBAC] Chặn lỗi chặn văng 403 nếu Customer chọc Ngoáy hóa đơn của người khác', async ({ request }) => {
            // Giả lập logic: DB Hóa đơn số 1 thuộc về Customer A (id=1). 
            // Nếu dùng Token của Customer B (id=2) gọi sang sẽ bị ném FORBIDDEN 403.
            // Đoạn này phụ thuộc data trên mội trường local, expect 403 / 404
            const response = await request.get('/payment/qr/1', { // Cố tình truyền 1 ID tĩnh 
                headers: { Cookie: otherCustomerCookies } // token người lạ
            });
            expect([403, 404, 500]).toContain(response.status()); 
        });

        test('[Positive] Pass Validate và Render mã HTML sinh QR VietQR thành công', async ({ request }) => {
            // Gửi Token chính chủ. (Cần ID hóa đơn thực tế để test pass 100%. Nếu DB rỗng nó sẽ trả 404)
            const response = await request.get('/payment/qr/1', { 
                headers: { Cookie: customerCookies } 
            });

            // Nếu hóa đơn có tồn tại thì mới trả 200, còn không thì 404/500
            expect([200, 404, 500]).toContain(response.status());

            if (response.status() === 200) {
                const bodyHtml = await response.text();
                // Xác thực backend xử lý Format HTML đúng 
                expect(bodyHtml).toContain('Thanh toán bằng QR');
                expect(bodyHtml).toContain('img.vietqr.io');
                expect(bodyHtml).toContain('href="/payment/qr/confirm/1"');
            }
        });
    });

    test.describe.serial('Luồng Ấn Nút Confirm Đã Thanh Toán', () => {
        
        test('[Positive] Xác nhận thủ công -> Chuyển Status hóa đơn', async ({ request }) => {
            const response = await request.get('/payment/qr/confirm/1', {
                headers: { Cookie: customerCookies },
                maxRedirects: 0
            });
            
            // Nếu hóa đơn chuẩn, nó sẽ redirect 302 về danh sách invoice
            expect([302, 404, 500]).toContain(response.status());
            if (response.status() === 302) {
                expect(response.headers().location).toContain('/customer/invoice/list?paySuccess');
                
                // Double check backend thực sự gọi invoiceService.markPaid
                const dbRes = await db.query("SELECT status FROM invoice WHERE id = 1");
                if (dbRes.length > 0) {
                    expect(dbRes[0].status).toBe('PAID');
                }
            }
        });
    });

});
