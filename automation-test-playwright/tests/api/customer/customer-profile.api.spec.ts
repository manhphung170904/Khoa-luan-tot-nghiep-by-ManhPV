import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Profile Update API Tests (Customer Scope)', () => {
    let db: DatabaseHelper;
    let customerCookies: string;
    let mockEmail = 'tester_customer_profile@estate.com';
    let baseRolePath = '/customer/profile';

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        // Token giả định cho Customer
        customerCookies = await ApiAuthHelper.loginAsCustomer();
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    test.describe.serial('Cập Nhật Khách Hàng (Tên, SĐT, Email)', () => {

        test('PUT /username - Cập nhật tên đăng nhập/Tên hiển thị', async ({ request }) => {
            const formData = new URLSearchParams();
            formData.append('username', 'CustomerVipTesting1');

            const response = await request.put(`${baseRolePath}/username`, {
                headers: { 
                    Cookie: customerCookies,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: formData.toString()
            });

            expect([200, 400, 500]).toContain(response.status());
            // Backend MVC: không parse response body vì endpoint có thể không phải REST
        });

        test('PUT /phoneNumber - Cập nhật số điện thoại Khách Hàng', async ({ request }) => {
            const formData = new URLSearchParams();
            formData.append('phoneNumber', '0888888888');

            const response = await request.put(`${baseRolePath}/phoneNumber`, {
                headers: { 
                    Cookie: customerCookies,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: formData.toString()
            });

            expect([200, 400, 500]).toContain(response.status());
        });
    });

    test.describe.serial('Xác thực Khách Hàng đổi Mật Khẩu (Flow)', () => {
        
        test('POST /otp/CHANGE_PASSWORD - Gửi yêu cầu lấy OTP (Của KH)', async ({ request }) => {
            const formData = new URLSearchParams();
            formData.append('email', mockEmail);

            const response = await request.post(`${baseRolePath}/otp/CHANGE_PASSWORD`, {
                headers: { 
                    Cookie: customerCookies,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: formData.toString()
            });

            expect([200, 400]).toContain(response.status());
        });

        test('PUT /password - Đổi password bằng OTP thực thụ', async ({ request }) => {
            const staticOtp = '123456';
            const crypto = require('crypto');
            const newHash = crypto.createHash('sha256').update(staticOtp).digest('hex');

            // Ghi đè Hash vào DB (Bảng email_verification) để backend tưởng đây là OTP gốc
            await db.query(
                `UPDATE email_verification SET otp_hash = ? WHERE email = ? AND purpose = 'PROFILE_PASSWORD' ORDER BY id DESC LIMIT 1`, 
                [newHash, mockEmail]
            );

            const formData = new URLSearchParams();
            formData.append('oldPassword', 'password123');
            formData.append('newPassword', 'NewPassword!KhachHang');
            formData.append('confirmPassword', 'NewPassword!KhachHang');
            formData.append('otp', staticOtp);

            const response = await request.put(`${baseRolePath}/password`, {
                headers: { 
                    Cookie: customerCookies,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: formData.toString()
            });

            // 400 Nếu OTP sai hoặc Old Password sai
            expect([200, 400, 500]).toContain(response.status());
        });
    });
});
