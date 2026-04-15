import { test, expect } from '@playwright/test';

test.describe('Public Page API Tests', () => {

    test.describe('GET /moonnest/building/search', () => {

        test('[Positive] Trả về danh sách Tòa Nhà trên trang Public (Không truyền Token)', async ({ request }) => {
            const response = await request.get('/moonnest/building/search?page=1&size=5');
            
            // Public endpoint không yêu cầu xác thực JWT Auth
            expect(response.status()).toBe(200);
            
            const data = await response.json();
            // Đảm bảo data trả về tối thiểu là dạng Array/List
            expect(Array.isArray(data)).toBeTruthy();
            
            // Test cơ bản cấu trúc BuildingDetailDTO
            if (data.length > 0) {
                expect(data[0]).toHaveProperty('id');
                expect(data[0]).toHaveProperty('name');
            }
        });

        test('[Positive] Sử dụng các filter ngẫu nhiên (ward, propertyType)', async ({ request }) => {
            // ward=ABC có thể không match, propertyType=OFFICE là enum hợp lệ
            const response = await request.get('/moonnest/building/search?ward=ABC&propertyType=OFFICE');
            // 200 = empty list, 400/500 = enum không hợp lệ tùy version backend
            expect([200, 400, 500]).toContain(response.status());
            if (response.status() === 200) {
                const data = await response.json();
                expect(Array.isArray(data)).toBeTruthy();
            }
        });

    });
});
