import { expect, test } from "@fixtures/api.fixture";
import { expectArrayBody, expectObjectBody, expectPageBody } from "@api/apiContractUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";

test.describe("Public Page API Tests @api-read @regression", () => {
  test.describe("GET /api/v1/public/buildings", () => {
    test("[API_TC_026] [Happy Path] Search public buildings and cross-check DB results @smoke", async ({
      anonymousApi
    }) => {
      const wardRows = await MySqlDbClient.query<{ ward: string }>(
        "SELECT ward FROM building WHERE ward IS NOT NULL AND ward <> '' LIMIT 1"
      );
      const ward = wardRows.length > 0 ? wardRows[0]!.ward : "Ward 1";

      const response = await anonymousApi.get("/api/v1/public/buildings", {
        params: {
          ward
        }
      });
      const data = await expectArrayBody<Record<string, unknown>>(response, 200);

      if (data.length > 0) {
        expect(typeof data[0]!.id).toBe("number");
        expect(typeof data[0]!.name).toBe("string");
        expect(String(data[0]!.name)).not.toHaveLength(0);
        expect(typeof data[0]!.address).toBe("string");
        expect(String(data[0]!.address)).not.toHaveLength(0);
        expect(typeof data[0]!.propertyType).toBe("string");
        expect(typeof data[0]!.transactionType).toBe("string");

        const returnedIds = data.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
        const dbRows = await MySqlDbClient.query<{ id: number }>(
          "SELECT id FROM building WHERE LOWER(ward) LIKE ?",
          [`%${ward.toLowerCase()}%`]
        );
        const dbIds = new Set(dbRows.map((row) => row.id));
        expect(returnedIds.every((id) => dbIds.has(id))).toBeTruthy();

        const countRows = await MySqlDbClient.query<{ total: number }>(
          "SELECT COUNT(*) AS total FROM building WHERE LOWER(ward) LIKE ?",
          [`%${ward.toLowerCase()}%`]
        );
        expect(countRows[0]!.total).toBeGreaterThanOrEqual(data.length);
      }
    });

    test("[API_TC_027] [Boundary] Search with invalid propertyType returns a valid empty result set @extended", async ({
      anonymousApi
    }) => {
      const response = await anonymousApi.get("/api/v1/public/buildings", {
        params: {
          propertyType: "INVALID_TYPE"
        }
      });
      const data = await expectArrayBody(response, 200);
      expect(data.length).toBeGreaterThanOrEqual(0);
    });

    test("[API_TC_028] [Happy Path] Page endpoint returns paged public buildings", async ({ anonymousApi }) => {
      const response = await anonymousApi.get("/api/v1/public/buildings/page", {
        params: {
          page: 1,
          size: 5
        }
      });
      const data = await expectPageBody<{
        content?: Array<Record<string, unknown>>;
        pageNumber?: number;
        pageSize?: number;
        totalElements?: number;
      }>(response, { status: 200 });
      expect(Array.isArray(data.content)).toBeTruthy();
      expect((data.content?.length ?? 0)).toBeLessThanOrEqual(5);
      expect(typeof data.totalElements).toBe("number");
      if ((data.content?.length ?? 0) > 0) {
        const first = data.content?.[0] as Record<string, unknown>;
        expect(typeof first.id).toBe("number");
        expect(typeof first.name).toBe("string");
        expect(typeof first.propertyType).toBe("string");
        expect(typeof first.transactionType).toBe("string");
      }
    });

    test("[API_TC_029] [Happy Path] Filters endpoint exposes public metadata", async ({ anonymousApi }) => {
      const response = await anonymousApi.get("/api/v1/public/buildings/filters");
      const data = await expectObjectBody<{
        districts?: unknown[];
        wards?: unknown[];
        streets?: unknown[];
        directions?: unknown[];
        levels?: unknown[];
      }>(response, 200, ["districts", "wards", "streets", "directions", "levels"]);
      expect(Array.isArray(data.districts)).toBeTruthy();
      expect(Array.isArray(data.wards)).toBeTruthy();
      expect(Array.isArray(data.streets)).toBeTruthy();
      expect(Array.isArray(data.directions)).toBeTruthy();
      expect(Array.isArray(data.levels)).toBeTruthy();
      if ((data.districts?.length ?? 0) > 0) {
        const firstDistrict = data.districts?.[0] as Record<string, unknown>;
        expect(firstDistrict).toBeTruthy();
      }
    });
  });
});



