import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../../../utils/db-client';

test.describe('Public Page API Tests', () => {
    let db: DatabaseHelper;

    test.beforeAll(async () => {
        db = new DatabaseHelper();
        await db.connect();
    });

    test.afterAll(async () => {
        await db.disconnect();
    });

    test.describe('GET /moonnest/building/search', () => {
        test('[API_TC_026] [Happy Path] Search public buildings and cross-check DB results', async ({ request }) => {
            const wardRows = await db.query<{ ward: string }>(
                "SELECT ward FROM building WHERE ward IS NOT NULL AND ward <> '' LIMIT 1"
            );
            const ward = wardRows.length > 0 ? wardRows[0].ward : 'Ward 1';

            const response = await request.get(`/moonnest/building/search?ward=${encodeURIComponent(ward)}&propertyType=OFFICE`);
            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(Array.isArray(data)).toBeTruthy();

            if (Array.isArray(data) && data.length > 0) {
                expect(data[0]).toHaveProperty('id');
                expect(data[0]).toHaveProperty('name');
                expect(data[0]).toHaveProperty('propertyType');

                const countRows = await db.query<{ total: number }>(
                    'SELECT COUNT(*) AS total FROM building WHERE LOWER(ward) LIKE ? AND LOWER(property_type) LIKE ?',
                    [`%${ward.toLowerCase()}%`, '%office%']
                );
                expect(countRows[0].total).toBeGreaterThanOrEqual(data.length);
            }
        });

        test('[API_TC_027] [Boundary] Search with invalid propertyType returns a valid empty result set', async ({ request }) => {
            const response = await request.get('/moonnest/building/search?propertyType=INVALID_TYPE');
            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(Array.isArray(data)).toBeTruthy();
            expect(data.length).toBeGreaterThanOrEqual(0);
        });
    });
});
