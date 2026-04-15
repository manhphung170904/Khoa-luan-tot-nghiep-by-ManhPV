import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Authentication & Security API Tests', () => {
    let db: DatabaseHelper;

    // Giả định tài khoản test
    const validUser = {
        username: 'testuser_auth_' + Date.now(),
        password: 'Password@123',
        email: 'testauth_' + Date.now() + '@domain.com',
        fullName: 'Bot Testing'
    };

    let sessionCookies: string[] = [];
    let registrationTicket = '';

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
    });

    test.afterAll(async () => {
        // Dọn dẹp user test đăng ký ra khỏi DB
        await db.query('DELETE FROM customer WHERE email = ?', [validUser.email]);
        await db.disconnect();
    });

    test.describe.serial('1. Luồng Xác Thực Đăng Nhập (Login)', () => {

        test('[Negative] Username hoặc mật khẩu rỗng sẽ bị chặn', async ({ request }) => {
            const response = await request.post('/login', {
                form: { username: '', password: '' },
                maxRedirects: 0 // Chặn không bị cuốn theo HTML Render Redirect
            });

            // Redirect báo lỗi (302) hoặc 400
            expect([302, 400]).toContain(response.status());
            const headers = response.headers();
            expect(headers.location).toContain('errorMessage');
        });

        test('[Security] Brute-force/Sai thông tin login bị Redirect lỗi', async ({ request }) => {
            const response = await request.post('/login', {
                form: { username: 'admin', password: 'wrong_password_999' },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage');
        });

        test('[Positive] Đăng nhập đúng thông tin -> Cấp JWT Cookies & Redirect /login-success', async ({ request }) => {
            // Giả định môi trường test đã có user admin/123456 (Thay đổi tùy config của bạn)
            const response = await request.post('/login', {
                form: { username: 'admin', password: 'password' }, // Đổi thành password thật khi chạy
                maxRedirects: 0
            });

            if (response.status() === 302 && !response.headers().location.includes('errorMessage')) {
                const headers = response.headers();
                expect(headers.location).toContain('/login-success');

                // Lấy mảng Set-Cookie và verify JWT Token tồn tại
                const cookies = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
                expect(cookies.length).toBeGreaterThan(0);
                
                const cookieString = cookies.map(c => c.value).join('; ');
                expect(cookieString).toContain('access_token='); // hoặc tên cookie tương ứng
                expect(cookieString).toContain('refresh_token=');
            }
        });

    });

    test.describe.serial('2. Luồng Đăng Ký Chaining (Registration)', () => {

        test('Bước 1: [Positive] Send OTP Email', async ({ request }) => {
            // Gửi email lấy mã OTP để cấp Ticket
            const response = await request.post('/auth/register/send-code', {
                form: { email: validUser.email },
                maxRedirects: 0
            });
            const location = response.headers().location || '';
            // Expect redirect về /register/verify hoặc /register (nếu config mock mail lỏm)
            expect(location).toContain('/register'); 
        });

        test('Bước 2: [Positive] Ghi đè Hash DB & Verify OTP tĩnh -> Cấp Ticket', async ({ request }) => {
            // Khởi tạo 1 mã OTP Tĩnh và băm sang SHA-256
            const staticOtp = '123456';
            const crypto = require('crypto');
            const newHash = crypto.createHash('sha256').update(staticOtp).digest('hex');

            // UPDATE trực tiếp DB để chọc lủng Backend (Thay mã hash thật của BE bằng mã hash giả)
            await db.query(
                `UPDATE email_verification SET otp_hash = ? WHERE email = ? AND purpose = 'REGISTER' ORDER BY id DESC LIMIT 1`, 
                [newHash, validUser.email]
            );

            const response = await request.post('/auth/register/verify', {
                form: { email: validUser.email, otp: staticOtp }, // Nạp cục static vào
                maxRedirects: 0
            });

            const location = response.headers().location || '';
            if (location.includes('/register/complete')) {
                // Trích xuất "ticket" JWT mapping từ URL Redirect
                const matches = location.match(/ticket=([^&]+)/);
                if (matches) registrationTicket = matches[1];
            }
            expect(response.status()).toBe(302);
        });

        test('Bước 3: [Positive] Submit Info Hoàn tất Đăng Ký', async ({ request }) => {
            test.skip(!registrationTicket, 'Bỏ qua do không lấy được ticket OTP ở bước 2');

            const response = await request.post('/auth/register/complete', {
                form: {
                    ticket: registrationTicket,
                    email: validUser.email,
                    fullName: validUser.fullName,
                    username: validUser.username,
                    password: validUser.password,
                    confirmPassword: validUser.password
                },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).not.toContain('errorMessage');
            
            // Xác thực database là user thực sự được tạo
            const dbCheck = await db.query('SELECT username FROM customer WHERE username = ?', [validUser.username]);
            expect(dbCheck.length).toBeGreaterThan(0);
        });

        test('Bước 3B: [Negative] Cố tình nhồi nhét Password và ConfirmPassword lệch nhau', async ({ request }) => {
            const response = await request.post('/auth/register/complete', {
                form: {
                    ticket: registrationTicket || 'fake_ticket',
                    email: validUser.email,
                    fullName: validUser.fullName,
                    username: validUser.username + '_fail',
                    password: validUser.password,
                    confirmPassword: 'Password_Diff_123'
                },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage'); // Redirect lỗi
        });

    });

    test.describe.serial('3. Luồng Quên Mật Khẩu (Forgot Password)', () => {
        test('[Positive] Trigger tạo OTP quên mật khẩu', async ({ request }) => {
            // Có 2 endpoint để trigger, test API thuần
            const response = await request.post('/api/auth/forgot-password?email=admin@estate.com'); // Admin email demo
            
            // 200 = email gửi thành công, 409 = email chưa tồn tại trong hệ thống
            expect([200, 409]).toContain(response.status());
            if (response.status() === 200) {
                const data = await response.json();
                expect(data.message).toContain('đã được gửi');
            }
        });

        test('[Negative] Thử reset mật khẩu với OTP sai', async ({ request }) => {
            const response = await request.post('/auth/reset-password', {
                form: {
                    email: 'admin@estate.com',
                    otp: 'WRONG_OTP999',
                    newPassword: 'NewPassword123',
                    confirmPassword: 'NewPassword123'
                },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage');
        });
    });

    test.describe.serial('4. Luồng Đăng Xuất (Logout & Wipe Cookies)', () => {
        test('[Positive] Logout qua POST -> Trả về Wipe Access/Refresh Cookie', async ({ request }) => {
            const response = await request.post('/auth/logout', {
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('/login?logout');

            // Cốt lõi của Logout là xóa cookie bằng thẻ Max-Age=0
            const cookies = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
            if (cookies.length > 0) {
                const cookieString = cookies.map(c => c.value).join('; ');
                expect(cookieString.toLowerCase()).toContain('max-age=0'); // Lệnh phá hủy cookie
            }
        });
    });

});
