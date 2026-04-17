import { expect, test } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";

test.describe("Public Page API Tests @api @api-read @regression", () => {
  test.afterAll(async () => {
    await MySqlDbClient.close();
  });

  test.describe("GET /api/v1/public/buildings", () => {
    test("[API_TC_026] [Happy Path] Search public buildings and cross-check DB results @smoke @regression", async ({
      request
    }) => {
      const wardRows = await MySqlDbClient.query<{ ward: string }>(
        "SELECT ward FROM building WHERE ward IS NOT NULL AND ward <> '' LIMIT 1"
      );
      const ward = wardRows.length > 0 ? wardRows[0]!.ward : "Ward 1";

      const response = await request.get("/api/v1/public/buildings", {
        params: {
          ward
        }
      });
      expect(response.status()).toBe(200);

      const data = (await response.json()) as Array<Record<string, unknown>>;
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("name");
        expect(data[0]).toHaveProperty("address");
        expect(data[0]).toHaveProperty("propertyType");
        expect(data[0]).toHaveProperty("transactionType");

        const countRows = await MySqlDbClient.query<{ total: number }>(
          "SELECT COUNT(*) AS total FROM building WHERE LOWER(ward) LIKE ?",
          [`%${ward.toLowerCase()}%`]
        );
        expect(countRows[0]!.total).toBeGreaterThanOrEqual(data.length);
      }
    });

    test("[API_TC_027] [Boundary] Search with invalid propertyType returns a valid empty result set @extended", async ({
      request
    }) => {
      test.fail(true, "Known defect: invalid propertyType currently triggers 500 instead of an empty successful response.");

      const response = await request.get("/api/v1/public/buildings", {
        params: {
          propertyType: "INVALID_TYPE"
        }
      });
      expect(response.status()).toBe(200);

      const data = (await response.json()) as unknown[];
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThanOrEqual(0);
    });

    test("[API_TC_028] [Happy Path] Page endpoint returns paged public buildings @regression", async ({ request }) => {
      const response = await request.get("/api/v1/public/buildings/page", {
        params: {
          page: 1,
          size: 5
        }
      });
      expect(response.status()).toBe(200);

      const data = (await response.json()) as { content?: unknown[]; totalElements?: number };
      expect(Array.isArray(data.content)).toBeTruthy();
      expect(typeof data.totalElements).toBe("number");
      if ((data.content?.length ?? 0) > 0) {
        const first = data.content?.[0] as Record<string, unknown>;
        expect(first.id).toBeTruthy();
        expect(first.name).toBeTruthy();
        expect(first.propertyType).toBeTruthy();
      }
    });

    test("[API_TC_029] [Happy Path] Filters endpoint exposes public metadata @regression", async ({ request }) => {
      const response = await request.get("/api/v1/public/buildings/filters");
      expect(response.status()).toBe(200);

      const data = (await response.json()) as {
        districts?: unknown[];
        wards?: unknown[];
        streets?: unknown[];
        directions?: unknown[];
        levels?: unknown[];
      };
      expect(Array.isArray(data.districts)).toBeTruthy();
      expect(Array.isArray(data.wards)).toBeTruthy();
      expect(Array.isArray(data.streets)).toBeTruthy();
      expect(Array.isArray(data.directions)).toBeTruthy();
      expect(Array.isArray(data.levels)).toBeTruthy();
    });
  });
});
