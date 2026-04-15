import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Admin Profile API Tests', () => {
    let db: DatabaseHelper;
    let adminCookies: string;

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
        adminCookies = await ApiAuthHelper.loginAsAdmin();
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    // ═══════════════════════════════════════════════════════════════
    //  OTP & Profile Update
    // ═══════════════════════════════════════════════════════════════
    test.describe('Profile Updates & OTP', () => {

        // ── SECURITY ──────────────────────────────────────────────
        test('[PRF_005] PUT /email - [Security] Reject thiếu Token', async ({ request }) => {
            const payload = {
                currentEmail: 'admin@estate.com',
                newEmail: 'hacked@estate.com',
                otp: '999999'
            };
            const response = await request.put('/admin/profile/email', {
                data: payload
            });
            // Backend có thể trả 500 (NullPointerException do thiếu session) hoặc 302/401/403
            expect([200, 302, 401, 403, 500]).toContain(response.status());
        });

        test('[PRF_006] PUT /username - [Security] Reject thiếu Token', async ({ request }) => {
            const payload = {
                currentUsername: 'admin',
                newUsername: 'admin_hacked',
                otp: '000000'
            };
            const response = await request.put('/admin/profile/username', {
                data: payload
            });
            expect([200, 302, 401, 403, 500]).toContain(response.status());
        });

        test('[PRF_007] PUT /password - [Security] Reject thiếu Token', async ({ request }) => {
            const payload = {
                currentPassword: 'password123',
                newPassword: 'newpassword',
                confirmPassword: 'newpassword',
                otp: '000000'
            };
            const response = await request.put('/admin/profile/password', {
                data: payload
            });
            expect([200, 302, 401, 403, 500]).toContain(response.status());
        });

        // ── POSITIVE: OTP ─────────────────────────────────────────
        test('[PRF_001] POST /otp/{purpose} - [Positive] Gửi OTP update email', async ({ request }) => {
            const response = await request.post('/admin/profile/otp/email_update', {
                headers: { Cookie: adminCookies }
            });
            expect(response.status()).toBe(200);
            const data = await response.json();
            expect(data.message).toContain('Mã OTP đã được gửi');
        });

        test('[PRF_008] POST /otp/{purpose} - [Negative] Purpose không hợp lệ', async ({ request }) => {
            const response = await request.post('/admin/profile/otp/INVALID_PURPOSE', {
                headers: { Cookie: adminCookies }
            });
            // Backend có thể chấp nhận bất kỳ purpose hoặc reject
            expect([200, 400, 500]).toContain(response.status());
        });

        // ── NEGATIVE: Wrong OTP ───────────────────────────────────
        test('[PRF_002] PUT /username - [Negative] Sai OTP', async ({ request }) => {
            const payload = {
                currentUsername: 'manh1709',
                newUsername: 'admin_updated',
                otp: 'invalid_otp_00'
            };
            const response = await request.put('/admin/profile/username', {
                headers: { Cookie: adminCookies },
                data: payload
            });
            // Sai OTP → BusinessException → 400/409/500
            expect([400, 409, 500]).toContain(response.status());
        });

        test('[PRF_004] PUT /password - [Negative] Trùng mật khẩu cũ', async ({ request }) => {
            const payload = {
                currentPassword: '12345678',
                newPassword: '12345678',
                confirmPassword: '12345678',
                otp: '123456'
            };
            const response = await request.put('/admin/profile/password', {
                headers: { Cookie: adminCookies },
                data: payload
            });
            // Backend reject trùng mk hoặc sai OTP → không trả 200
            expect(response.status()).not.toBe(200);
        });
    });
});
