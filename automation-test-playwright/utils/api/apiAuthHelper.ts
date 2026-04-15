import { APIRequestContext, request as pwRequest } from '@playwright/test';
import { env } from '../../config/env';

/**
 * ─── API Authentication Helper ───
 * 
 * Backend MoonNest dùng Cookie-based JWT (không phải Bearer token).
 * Luồng xác thực: POST /login (form) → Server trả 302 + Set-Cookie: estate_access_token=...; estate_refresh_token=...
 * 
 * Tất cả API test cần dùng class này để login và lấy Cookie header thay vì "Authorization: Bearer xxx".
 */
export class ApiAuthHelper {
    /**
     * Login bằng form POST và trả về Cookie string để dùng trong headers.
     * @returns Cookie string dạng "estate_access_token=xxx; estate_refresh_token=yyy"
     */
    static async login(username: string, password: string): Promise<string> {
        // Tạo 1 context riêng biệt để login, tránh xung đột cookie
        const ctx = await pwRequest.newContext({
            baseURL: env.baseUrl,
        });

        try {
            const response = await ctx.post('/login', {
                form: { username, password },
                maxRedirects: 0  // Bắt redirect 302, không follow
            });

            if (response.status() !== 302) {
                const location = response.headers()['location'] || '';
                throw new Error(
                    `Login failed for "${username}": status=${response.status()}, location=${location}`
                );
            }

            // Kiểm tra redirect location (phải về /login-success, không phải /login?errorMessage=...)
            const location = response.headers()['location'] || '';
            if (location.includes('errorMessage')) {
                throw new Error(`Login failed for "${username}": ${decodeURIComponent(location)}`);
            }

            // Trích xuất JWT cookies từ Set-Cookie headers
            const setCookieHeaders = response.headersArray()
                .filter(h => h.name.toLowerCase() === 'set-cookie');

            const cookies: string[] = [];
            for (const header of setCookieHeaders) {
                // Set-Cookie value dạng: "estate_access_token=xxx; Path=/; HttpOnly; ..."
                // Chỉ lấy phần "name=value" trước dấu ;
                const nameValue = header.value.split(';')[0].trim();
                if (nameValue.includes('estate_access_token') || nameValue.includes('estate_refresh_token')) {
                    cookies.push(nameValue);
                }
            }

            if (cookies.length === 0) {
                throw new Error(`Login succeeded but no JWT cookies found in response for "${username}"`);
            }

            return cookies.join('; ');
        } finally {
            await ctx.dispose();
        }
    }

    /**
     * Login dưới vai trò Admin (dùng credentials từ .env)
     */
    static async loginAsAdmin(): Promise<string> {
        return this.login(env.adminUsername, env.defaultPassword);
    }

    /**
     * Login dưới vai trò Staff (dùng credentials từ .env)
     */
    static async loginAsStaff(): Promise<string> {
        return this.login(env.staffUsername, env.defaultPassword);
    }

    /**
     * Login dưới vai trò Customer (dùng credentials từ .env)
     */
    static async loginAsCustomer(): Promise<string> {
        return this.login(env.customerUsername, env.defaultPassword);
    }
}
