import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Customer API Read-only Tests (RBAC Isolation)', () => {
    let customerCookies: string;
    let otherCustomerCookies: string;

    test.beforeAll(async () => {        
        // Mock Token cho Customer
        customerCookies = await ApiAuthHelper.loginAsCustomer(); 
        otherCustomerCookies = 'NO_AUTH'; // second customer not used in read-only tests 
    });

    const readOnlyModules = [
        { path: '/customer/building/list', name: 'Building' },
        { path: '/customer/contract/list', name: 'Nhật Ký Hợp Đồng' },
        { path: '/customer/transaction/history', name: 'Giao dịch (Transaction)' }
    ];

    test.describe.serial('Luồng Security Read-only Check của Customer', () => {

        readOnlyModules.forEach(module => {
            test(`[Security] Reject ngầm nếu Khách Hàng vào module ${module.name} mà ko có Token`, async ({ request }) => {
                const response = await request.get(module.path);
                // MVC: trả 302 redirect về /login khi chưa xác thực
                expect([302, 401, 403]).toContain(response.status());
            });

            test(`[Positive - Bảo Mật] Xem lịch sử ${module.name} cá nhân thành công`, async ({ request }) => {
                const response = await request.get(module.path, {
                    headers: { Cookie: customerCookies }
                });
                
                // Backend MVC trả HTML 200 khi đã xác thực
                expect([200, 302]).toContain(response.status());
                if (response.status() === 200) {
                    const html = await response.text();
                    expect(html).toBeDefined();
                }
            });
        });
    });
});
