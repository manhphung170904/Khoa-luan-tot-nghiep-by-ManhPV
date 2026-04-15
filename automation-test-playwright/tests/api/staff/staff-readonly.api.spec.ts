import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Staff API Read-only Tests (RBAC Isolation)', () => {
    let db: DatabaseHelper;
    let staffCookies: string;

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        
        // Mock Token cho Staff (Nhân viên giả lập đã được mapping ID)
        staffCookies = await ApiAuthHelper.loginAsStaff(); 
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    // Mảng các module bị Khóa quyền Write (Chỉ có quyền Read-only search)
    const readOnlyModules = [
        { path: '/staff/buildings', name: 'Building' },
        { path: '/staff/contracts', name: 'Lease Contract' },
        { path: '/staff/sale-contracts', name: 'Sale Contract' },
        { path: '/staff/customers', name: 'Customer' }
    ];

    test.describe.serial('Luồng Security Read-only Check', () => {

        readOnlyModules.forEach(module => {
            test(`[Security] Reject ngầm nếu truy cập ${module.name} mà thiếu JWT Staff Token`, async ({ request }) => {
                const response = await request.get(module.path);
                expect([302, 401, 403]).toContain(response.status());
            });

            test(`[Positive - RBAC Bound] Lấy danh sách ${module.name} Scope Staff`, async ({ request }) => {
                const response = await request.get(module.path, {
                    headers: { Cookie: staffCookies }
                });
                
                // Backend MVC: trả HTML 200 khi đã xác thực
                expect([200, 302]).toContain(response.status());
                if (response.status() === 200) {
                    const html = await response.text();
                    expect(html.length).toBeGreaterThan(0);
                } 
            });

            test(`[Negative] Cố tình gọi hàm POST/PUT lén/thò tay lách rào vào ${module.name} (Tapping Hack)`, async ({ request }) => {
                // Tận dụng URL read-only và thay bằng Method POST (VD: /staff/building/add)
                // Theo đúng logic mã nguồn, BE của Staff hoàn toàn KHÔNG CÓ CÁC Controller MAPPING endpoint này. 
                // Do đó kết quả mong muốn là 404 Not Found, hoặc 403 Forbidden thay vì 500 do kẹt lỗi.
                const mockHackedRoute = module.path + '/add';
                const response = await request.post(mockHackedRoute, {
                    headers: { Cookie: staffCookies },
                    data: { "someFakeData": "attack" }
                });
                expect([404, 405, 403]).toContain(response.status()); 
            });
        });
    });
});
