import { test, expect } from '@playwright/test';
import { ApiAuthHelper } from '../../../utils/api/apiAuthHelper';
import { DatabaseHelper } from '../../../utils/db-client';
import { env } from '../../../config/env';
import { createHash } from 'crypto';

test.describe('Customer Profile API Tests', () => {
    let db: DatabaseHelper;
    let customerCookies: string;
    let customerId: number;
    let originalEmail: string;
    let originalPhone: string;
    let originalPasswordHash: string;
    let customerEmail: string;
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

        customerCookies = await ApiAuthHelper.loginAsCustomer();

        const rows = await db.query<{ id: number; email: string; phone: string; password: string }>(
            'SELECT id, email, phone, password FROM customer WHERE username = ? LIMIT 1',
            [env.customerUsername]
        );
        expect(rows.length).toBeGreaterThan(0);
        customerId = rows[0].id;
        customerEmail = rows[0].email;
        originalEmail = rows[0].email;
        originalPhone = rows[0].phone;
        originalPasswordHash = rows[0].password;
    });

    test.afterAll(async () => {
        await db.query(
            'UPDATE customer SET email = ?, phone = ?, password = ? WHERE id = ?',
            [originalEmail, originalPhone, originalPasswordHash, customerId]
        );
        await db.disconnect();
    });

    test.describe.serial('Customer Profile - Update flows with DB validation', () => {
        test('[API_TC_011] [Happy Path] Update email with valid password and verify DB change', async ({ request }) => {
            const newEmail = `customer_email_update_${Date.now()}@example.com`;
            const response = await request.put('/customer/profile/email', {
                headers: {
                    Cookie: customerCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    newEmail,
                    password: env.defaultPassword
                }
            });

            expect(response.status()).toBe(200);

            const dbRows = await db.query<{ email: string }>(
                'SELECT email FROM customer WHERE id = ?',
                [customerId]
            );
            expect(dbRows.length).toBe(1);
            expect(dbRows[0].email).toBe(newEmail);
        });

        test('[API_TC_012] [Negative] Reject customer email update with wrong current password', async ({ request }) => {
            const response = await request.put('/customer/profile/email', {
                headers: {
                    Cookie: customerCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    newEmail: `invalid_email_${Date.now()}@example.com`,
                    password: 'wrong-password-123'
                }
            });

            expect(response.status()).not.toBe(200);
        });

        test('[API_TC_013] [Happy Path] Send OTP for phone update and update phone successfully', async ({ request }) => {
            const responseOtp = await request.post('/customer/profile/otp/PROFILE_PHONE', {
                headers: { Cookie: customerCookies }
            });
            expect(responseOtp.status()).toBe(200);

            const currentEmail = (await db.query<{ email: string }>('SELECT email FROM customer WHERE id = ?', [customerId]))[0].email;
            await resetOtpRow(currentEmail, 'PROFILE_PHONE', staticOtp);

            const newPhone = `09${Math.floor(100000000 + Math.random() * 900000000)}`;
            const responseUpdate = await request.put('/customer/profile/phoneNumber', {
                headers: {
                    Cookie: customerCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    newPhoneNumber: newPhone,
                    otp: staticOtp
                }
            });

            expect(responseUpdate.status()).toBe(200);

            const dbRows = await db.query<{ phone: string }>('SELECT phone FROM customer WHERE id = ?', [customerId]);
            expect(dbRows[0].phone).toBe(newPhone);
        });

        test('[API_TC_014] [Boundary] Update password with OTP and verify DB hash changed', async ({ request }) => {
            const currentPasswordHash = (await db.query<{ password: string }>(
                'SELECT password FROM customer WHERE id = ?',
                [customerId]
            ))[0].password;

            const responseOtp = await request.post('/customer/profile/otp/PROFILE_PASSWORD', {
                headers: { Cookie: customerCookies }
            });
            expect(responseOtp.status()).toBe(200);

            const currentEmail = (await db.query<{ email: string }>('SELECT email FROM customer WHERE id = ?', [customerId]))[0].email;
            await resetOtpRow(currentEmail, 'PROFILE_PASSWORD', staticOtp);

            const responseUpdate = await request.put('/customer/profile/password', {
                headers: {
                    Cookie: customerCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    currentPassword: env.defaultPassword,
                    newPassword: 'NewCustomerPwd1!',
                    confirmPassword: 'NewCustomerPwd1!',
                    otp: staticOtp
                }
            });

            expect(responseUpdate.status()).toBe(200);

            const newPasswordHash = (await db.query<{ password: string }>('SELECT password FROM customer WHERE id = ?', [customerId]))[0].password;
            expect(newPasswordHash).not.toBe(currentPasswordHash);
        });

        test('[API_TC_015] [Negative] Reject password update when confirmation does not match', async ({ request }) => {
            const responseOtp = await request.post('/customer/profile/otp/PROFILE_PASSWORD', {
                headers: { Cookie: customerCookies }
            });
            expect(responseOtp.status()).toBe(200);

            const currentEmail = (await db.query<{ email: string }>('SELECT email FROM customer WHERE id = ?', [customerId]))[0].email;
            await resetOtpRow(currentEmail, 'PROFILE_PASSWORD', staticOtp);

            const responseUpdate = await request.put('/customer/profile/password', {
                headers: {
                    Cookie: customerCookies,
                    'Content-Type': 'application/json'
                },
                data: {
                    currentPassword: env.defaultPassword,
                    newPassword: 'NewCustomerPwd1!',
                    confirmPassword: 'MismatchPassword',
                    otp: staticOtp
                }
            });

            expect(responseUpdate.status()).not.toBe(200);
        });
    });
});
