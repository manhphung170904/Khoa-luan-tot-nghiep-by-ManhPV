import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../../utils/db-client';
import { env } from '../../../config/env';
import { createHash } from 'crypto';

test.describe('Authentication & Security API Tests @api @regression', () => {
    let db: DatabaseHelper;
    let validUser = {
        username: `testuser_auth_${Date.now()}`,
        password: 'Password@123',
        email: `testauth_${Date.now()}@example.com`,
        fullName: 'Bot Testing'
    };
    let validLocalEmail = '';
    let registrationTicket = '';

    const staticOtp = '123456';

    const hashOtp = (otp: string) => createHash('sha256').update(otp).digest('hex');

    const setLatestVerificationOtp = async (email: string, purpose: string, otp: string) => {
        const row = await db.query<{ id: number }>(
            'SELECT id FROM email_verification WHERE email = ? AND purpose = ? AND status = ? ORDER BY id DESC LIMIT 1',
            [email, purpose, 'PENDING']
        );
        expect(row.length).toBeGreaterThan(0);
        await db.query('UPDATE email_verification SET otp_hash = ? WHERE id = ?', [hashOtp(otp), row[0].id]);
    };

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();

        const customers = await db.query<{ email: string }>(
            'SELECT email FROM customer WHERE username = ? LIMIT 1',
            [env.customerUsername]
        );
        if (customers.length > 0) {
            validLocalEmail = customers[0].email;
        } else {
            const staffRows = await db.query<{ email: string }>(
                'SELECT email FROM staff WHERE username = ? LIMIT 1',
                [env.staffUsername]
            );
            validLocalEmail = staffRows.length > 0 ? staffRows[0].email : '';
        }
    });

    test.afterAll(async () => {
        await db.query('DELETE FROM customer WHERE email = ?', [validUser.email]);
        await db.query('DELETE FROM email_verification WHERE email = ? AND purpose = ?', [validUser.email, 'REGISTER']);
        await db.disconnect();
    });

    test.describe.serial('1. Login + Authentication', () => {
        test('[API_TC_001] [Happy Path] Login with valid credentials returns JWT cookies and redirect @smoke @regression', async ({ request }) => {
            const response = await request.post('/login', {
                form: { username: env.adminUsername, password: env.defaultPassword },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('/login-success');

            const cookies = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
            expect(cookies.length).toBeGreaterThan(0);
            const cookieString = cookies.map(c => c.value).join('; ');
            expect(cookieString).toContain('estate_access_token=');
            expect(cookieString).toContain('estate_refresh_token=');
        });

        test('[API_TC_002] [Negative] Blank username/password returns login error redirect @regression', async ({ request }) => {
            const response = await request.post('/login', {
                form: { username: '', password: '' },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage');
        });

        test('[API_TC_003] [Negative] Wrong credentials are rejected @regression', async ({ request }) => {
            const response = await request.post('/login', {
                form: { username: env.adminUsername, password: 'bad-password-123' },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage');
        });
    });

    test.describe.serial('2. Registration + Database Chaining', () => {
        test('[API_TC_004] [Happy Path] Send registration OTP and persist pending verification row @regression', async ({ request }) => {
            const response = await request.post('/auth/register/send-code', {
                form: { email: validUser.email },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('/register');

            const rows = await db.query<{ id: number; email: string; purpose: string; status: string }>(
                'SELECT id, email, purpose, status FROM email_verification WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1',
                [validUser.email, 'REGISTER']
            );
            expect(rows.length).toBeGreaterThan(0);
            expect(rows[0].status).toBe('PENDING');
        });

        test('[API_TC_005] [Happy Path] Verify registration OTP by injecting static OTP hash into DB @extended', async ({ request }) => {
            await setLatestVerificationOtp(validUser.email, 'REGISTER', staticOtp);

            const response = await request.post('/auth/register/verify', {
                form: { email: validUser.email, otp: staticOtp },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('/register/complete');

            const ticketMatch = response.headers().location.match(/ticket=([^&]+)/);
            expect(ticketMatch).not.toBeNull();
            registrationTicket = ticketMatch?.[1] ?? '';
            expect(registrationTicket).not.toBe('');
        });

        test('[API_TC_006] [Happy Path] Complete registration and verify customer row created @regression', async ({ request }) => {
            expect(registrationTicket).not.toBe('');

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

            const createdRows = await db.query<{ username: string; email: string }>(
                'SELECT username, email FROM customer WHERE username = ? AND email = ?',
                [validUser.username, validUser.email]
            );
            expect(createdRows.length).toBe(1);
        });

        test('[API_TC_007] [Negative] Complete registration fails when passwords do not match @regression', async ({ request }) => {
            const response = await request.post('/auth/register/complete', {
                form: {
                    ticket: registrationTicket || 'invalid_ticket',
                    email: validUser.email,
                    fullName: validUser.fullName,
                    username: `${validUser.username}_failed`,
                    password: validUser.password,
                    confirmPassword: 'WrongConfirm!'
                },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage');
        });
    });

    test.describe.serial('3. Forgot Password + Reset Password', () => {
        test('[API_TC_008] [Happy Path] Request forgot password and check OTP row in DB @regression', async ({ request }) => {
            expect(validLocalEmail).toBeTruthy();
            const response = await request.post(`/api/v1/auth/forgot-password?email=${encodeURIComponent(validLocalEmail)}`);
            expect(response.status()).toBe(200);

            const rows = await db.query<{ id: number; email: string; purpose: string; status: string }>(
                'SELECT id, email, purpose, status FROM email_verification WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1',
                [validLocalEmail, 'RESET_PASSWORD']
            );
            expect(rows.length).toBeGreaterThan(0);
            expect(rows[0].status).toBe('PENDING');
        });

        test('[API_TC_009] [Negative] Reset password with incorrect OTP is rejected @extended', async ({ request }) => {
            expect(validLocalEmail).toBeTruthy();
            await request.post(`/api/v1/auth/forgot-password?email=${encodeURIComponent(validLocalEmail)}`);
            await setLatestVerificationOtp(validLocalEmail, 'RESET_PASSWORD', staticOtp);

            const response = await request.post('/auth/reset-password', {
                form: {
                    email: validLocalEmail,
                    otp: '000000',
                    newPassword: 'NewPassword123',
                    confirmPassword: 'NewPassword123'
                },
                maxRedirects: 0
            });

            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('errorMessage');
        });
    });

    test.describe.serial('4. Logout', () => {
        test('[API_TC_010] [Security] Logout clears auth cookies and redirects to login @smoke @regression', async ({ request }) => {
            const response = await request.post('/auth/logout', { maxRedirects: 0 });
            expect(response.status()).toBe(302);
            expect(response.headers().location).toContain('/login?logout');

            const cookies = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
            if (cookies.length > 0) {
                const cookieString = cookies.map(c => c.value).join('; ');
                expect(cookieString.toLowerCase()).toContain('max-age=0');
            }
        });
    });
});
