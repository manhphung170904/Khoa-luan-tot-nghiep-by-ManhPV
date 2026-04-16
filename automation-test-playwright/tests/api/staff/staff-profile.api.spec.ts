import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';
import { env } from '../../../config/env';
import { createHash } from 'crypto';

test.describe('Staff Profile API Tests', () => {
    let db: DatabaseHelper;
    let staffCookies: string;
    let staffId: number;
    let originalEmail: string;
    let originalPhone: string;
    let originalPasswordHash: string;
    let staffEmail: string;
    const staticOtp = '123456';

    const hashOtp = (otp: string) => createHash('sha256').update(otp).digest('hex');

    const resetOtpRow = async (email: string, purpose: string, otp: string) => {
        const rows = await db.query<{ id: number }>(
            'SELECT id FROM email_verification WHERE email = ? AND purpose = ? AND status = ? ORDER BY id DESC LIMIT 1',
            [email, purpose, 'PENDING']
        );
        expect(rows.length).toBeGreaterThan(0);
        await db.query('UPDATE email_verification SET otp_hash = ? WHERE id = ?', [hashOtp(otp), rows[0].id]);
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();

        staffCookies = await ApiAuthHelper.loginAsStaff();
        const rows = await db.query<{ id: number; email: string; phone: string; password: string }>(
            'SELECT id, email, phone, password FROM staff WHERE username = ? LIMIT 1',
            [env.staffUsername]
        );
        expect(rows.length).toBeGreaterThan(0);
        staffId = rows[0].id;
        staffEmail = rows[0].email;
        originalEmail = rows[0].email;
        originalPhone = rows[0].phone;
        originalPasswordHash = rows[0].password;
    });

    test.afterAll(async () => {
        await db.query(
            'UPDATE staff SET email = ?, phone = ?, password = ? WHERE id = ?',
            [originalEmail, originalPhone, originalPasswordHash, staffId]
        );
        await db.disconnect();
    });

    test.describe.serial('Staff profile update flow with DB assertions', () => {
        test('[API_TC_016] [Happy Path] Update staff email with valid password and DB verify', async ({ request }) => {
            const responseOtp = await request.post('/api/v1/staff/profile/otp/PROFILE_EMAIL', {
                headers: { Cookie: staffCookies }
            });
            expect(responseOtp.status()).toBe(200);

            await resetOtpRow(originalEmail, 'PROFILE_EMAIL', staticOtp);

            const newEmail = `staff_update_${Date.now()}@example.com`;
            const response = await request.put('/api/v1/staff/profile/email', {
                headers: {
                    Cookie: staffCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    newEmail,
                    password: env.defaultPassword
                }
            });

            expect(response.status()).toBe(200);

            const dbRows = await db.query<{ email: string }>('SELECT email FROM staff WHERE id = ?', [staffId]);
            expect(dbRows.length).toBe(1);
            expect(dbRows[0].email).toBe(newEmail);
        });

        test('[API_TC_017] [Negative] Reject staff email update with wrong current password', async ({ request }) => {
            const response = await request.put('/api/v1/staff/profile/email', {
                headers: {
                    Cookie: staffCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    newEmail: `staff_invalid_${Date.now()}@example.com`,
                    password: 'wrong-password'
                }
            });

            expect(response.status()).not.toBe(200);
        });

        test('[API_TC_018] [Happy Path] Update staff phone with OTP and verify DB value', async ({ request }) => {
            const responseOtp = await request.post('/api/v1/staff/profile/otp/PROFILE_PHONE', {
                headers: { Cookie: staffCookies }
            });
            expect(responseOtp.status()).toBe(200);

            const currentEmail = (await db.query<{ email: string }>('SELECT email FROM staff WHERE id = ?', [staffId]))[0].email;
            await resetOtpRow(currentEmail, 'PROFILE_PHONE', staticOtp);

            const newPhone = `098${Math.floor(100000000 + Math.random() * 900000000)}`;
            const response = await request.put('/api/v1/staff/profile/phone-number', {
                headers: {
                    Cookie: staffCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    newPhoneNumber: newPhone,
                    otp: staticOtp
                }
            });

            expect(response.status()).toBe(200);

            const dbRows = await db.query<{ phone: string }>('SELECT phone FROM staff WHERE id = ?', [staffId]);
            expect(dbRows.length).toBe(1);
            expect(dbRows[0].phone).toBe(newPhone);
        });

        test('[API_TC_019] [Boundary] Reject staff password update when new password is too short', async ({ request }) => {
            const responseOtp = await request.post('/api/v1/staff/profile/otp/PROFILE_PASSWORD', {
                headers: { Cookie: staffCookies }
            });
            expect(responseOtp.status()).toBe(200);

            await resetOtpRow(staffEmail, 'PROFILE_PASSWORD', staticOtp);

            const response = await request.put('/api/v1/staff/profile/password', {
                headers: {
                    Cookie: staffCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    currentPassword: env.defaultPassword,
                    newPassword: 'short',
                    confirmPassword: 'short',
                    otp: staticOtp
                }
            });

            expect(response.status()).not.toBe(200);
        });

        test('[API_TC_020] [Happy Path] Update staff password with OTP and confirm DB hash changed', async ({ request }) => {
            const currentPasswordHash = (await db.query<{ password: string }>('SELECT password FROM staff WHERE id = ?', [staffId]))[0].password;

            const responseOtp = await request.post('/api/v1/staff/profile/otp/PROFILE_PASSWORD', {
                headers: { Cookie: staffCookies }
            });
            expect(responseOtp.status()).toBe(200);

            const currentEmail = (await db.query<{ email: string }>('SELECT email FROM staff WHERE id = ?', [staffId]))[0].email;
            await resetOtpRow(currentEmail, 'PROFILE_PASSWORD', staticOtp);

            const response = await request.put('/api/v1/staff/profile/password', {
                headers: {
                    Cookie: staffCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    currentPassword: env.defaultPassword,
                    newPassword: 'NewStaffPassword1!',
                    confirmPassword: 'NewStaffPassword1!',
                    otp: staticOtp
                }
            });

            expect(response.status()).toBe(200);

            const newPasswordHash = (await db.query<{ password: string }>('SELECT password FROM staff WHERE id = ?', [staffId]))[0].password;
            expect(newPasswordHash).not.toBe(currentPasswordHash);
        });
    });
});

