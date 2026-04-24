import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";

type PublicBuildingRow = {
  id: number;
  name: string;
  districtId: number | null;
  districtName: string | null;
  ward: string | null;
  street: string | null;
  direction: string | null;
  level: string | null;
  transactionType: "FOR_RENT" | "FOR_SALE";
  image: string | null;
  rentPrice: number | null;
  salePrice: number | null;
};

const PUBLIC_VISIBILITY_WHERE = `
(
  (b.transaction_type = 'FOR_SALE' AND NOT EXISTS (
    SELECT 1 FROM sale_contract sc WHERE sc.building_id = b.id
  ))
  OR
  (b.transaction_type = 'FOR_RENT' AND (
    EXISTS (SELECT 1 FROM rent_area ra WHERE ra.building_id = b.id)
    OR EXISTS (SELECT 1 FROM contract c WHERE c.building_id = b.id AND c.status = 'EXPIRED')
  ))
)
`;

const BASE_BUILDING_SELECT = `
  SELECT
    b.id,
    b.name,
    b.district_id AS districtId,
    d.name AS districtName,
    b.ward,
    b.street,
    b.direction,
    b.level,
    b.transaction_type AS transactionType,
    b.image,
    b.rent_price AS rentPrice,
    b.sale_price AS salePrice
  FROM building b
  LEFT JOIN district d ON d.id = b.district_id
`;

const getSingleVisibleBuilding = async (extraWhere = "", params: Array<string | number> = []): Promise<PublicBuildingRow | null> => {
  const rows = await MySqlDbClient.query<PublicBuildingRow>(
    `
      ${BASE_BUILDING_SELECT}
      WHERE ${PUBLIC_VISIBILITY_WHERE}
      ${extraWhere ? `AND ${extraWhere}` : ""}
      ORDER BY b.id DESC
      LIMIT 1
    `,
    params
  );

  return rows[0] ?? null;
};

const getVisibleBuildingCount = async (): Promise<number> => {
  const rows = await MySqlDbClient.query<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM building b
      WHERE ${PUBLIC_VISIBILITY_WHERE}
    `
  );

  return Number(rows[0]?.total ?? 0);
};

test.describe("Public - Building Browsing @regression", () => {
  test.beforeEach(async ({ publicPage }) => {
    await publicPage.open();
    await publicPage.expectResultsLoaded();
  });

  test.afterAll(async () => {
  });

  test("[E2E-PUB-BLD-001] - Public Building Browsing - Landing Page - Default Filters and Initial Results Display", async ({ page, publicPage }) => {
    const total = await getVisibleBuildingCount();
    expect(total).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/moonnest$/);
    await expect(publicPage.filterForm).toBeVisible();
    await expect(publicPage.searchButton).toBeVisible();
    await publicPage.expectHasResults();
    await expect(await publicPage.resultSummaryText()).toMatch(/tìm thấy|tim thay|found/i);
  });

  test("[E2E-PUB-BLD-002] - Public Building Browsing - Query Parameter - Building Name Prefill and Auto Search", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding();
    test.skip(!targetBuilding, "No public building data is available for this test.");
    if (!targetBuilding) {
      return;
    }

    await publicPage.open(`buildingName=${encodeURIComponent(targetBuilding.name)}`);
    await publicPage.expectResultsLoaded();

    await expect(publicPage.buildingNameInput).toHaveValue(targetBuilding.name);
    await expect(publicPage.cardByName(targetBuilding.name)).toBeVisible();
  });

  test("[E2E-PUB-BLD-003] - Public Building Browsing - Filter Metadata - Dropdown Metadata Loading", async ({ publicPage }) => {
    await expect.poll(() => publicPage.optionCount("districtId")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("ward")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("street")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("direction")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("level")).toBeGreaterThan(1);
  });

  test("[E2E-PUB-BLD-004] - Public Building Browsing - Building Name Filter - Exact Name Search Result", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding();
    test.skip(!targetBuilding, "No public building data is available for this test.");
    if (!targetBuilding) {
      return;
    }

    await publicPage.searchByBuildingName(targetBuilding.name);

    await expect(publicPage.cardByName(targetBuilding.name)).toBeVisible();
    expect(await publicPage.cardCount()).toBeGreaterThan(0);

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM building b
        WHERE ${PUBLIC_VISIBILITY_WHERE}
          AND b.id = ?
          AND b.name = ?
      `,
      [targetBuilding.id, targetBuilding.name]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-PUB-BLD-005] - Public Building Browsing - District Filter - District Narrowing Results", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding("b.district_id IS NOT NULL");
    test.skip(!targetBuilding?.districtId, "No public building with district data is available for this test.");
    if (!targetBuilding?.districtId) {
      return;
    }

    await publicPage.fillFilter("name", targetBuilding.name);
    await publicPage.selectDistrict(String(targetBuilding.districtId));
    await publicPage.search();

    await expect(publicPage.cardByName(targetBuilding.name)).toBeVisible();
    await publicPage.openBuildingDetailsByName(targetBuilding.name);
    await expect(publicPage.detailModalBody).toContainText(targetBuilding.districtName ?? "");

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM building b
        WHERE ${PUBLIC_VISIBILITY_WHERE}
          AND b.id = ?
          AND b.district_id = ?
      `,
      [targetBuilding.id, targetBuilding.districtId]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-PUB-BLD-006] - Public Building Browsing - Filter Reset - Restore Default State", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding("b.district_id IS NOT NULL");
    test.skip(!targetBuilding?.districtId, "No public building with district data is available for this test.");
    if (!targetBuilding?.districtId) {
      return;
    }

    await publicPage.fillFilter("name", targetBuilding.name);
    await publicPage.selectDistrict(String(targetBuilding.districtId));
    await publicPage.fillNumberRange("numberOfFloorFrom", "numberOfFloorTo", "1", "9");

    await publicPage.resetFilters();

    await expect(publicPage.buildingNameInput).toHaveValue("");
    await expect(publicPage.filterInput("numberOfFloorFrom")).toHaveValue("");
    await expect(publicPage.filterInput("numberOfFloorTo")).toHaveValue("");
    expect(await publicPage.selectedValue("districtId")).toBe("");
  });

  test("[E2E-PUB-BLD-007] - Public Building Browsing - Search Results - Empty State for Unmatched Search", async ({ publicPage }) => {
    await publicPage.searchByBuildingName(TestDataFactory.taoMaDuyNhat("zzz-e2e-no-match"));

    await publicPage.expectEmptyState();
    expect(await publicPage.cardCount()).toBe(0);
  });

  test("[E2E-PUB-BLD-008] - Public Building Browsing - Pagination - Multi-Page Navigation and Active Page Update", async ({ publicPage }) => {
    const total = await getVisibleBuildingCount();
    test.skip(total <= 9, "The current public building count does not exceed a single page.");

    const firstPageNames = await publicPage.cardNames();
    expect(firstPageNames.length).toBeGreaterThan(0);

    await expect(publicPage.paginationContainer).toBeVisible();
    expect(await publicPage.paginationCount()).toBeGreaterThan(1);

    await publicPage.clickPaginationPage(2);

    await expect(publicPage.paginationButton(2)).toBeVisible();
    await expect.poll(() => publicPage.activePaginationText()).toBe("2");
    const secondPageNames = await publicPage.cardNames();
    expect(secondPageNames.length).toBeGreaterThan(0);
    expect(secondPageNames.join("|")).not.toBe(firstPageNames.join("|"));
  });

  test("[E2E-PUB-BLD-009] - Public Building Browsing - Rental Building Details - Modal Display with Key Information and Price", async ({ publicPage }) => {
    const rentBuilding = await getSingleVisibleBuilding("b.transaction_type = 'FOR_RENT'");
    test.skip(!rentBuilding, "No public FOR_RENT building is available for this test.");
    if (!rentBuilding) {
      return;
    }

    await publicPage.searchByBuildingName(rentBuilding.name);
    await publicPage.openBuildingDetailsByName(rentBuilding.name);

    await expect(publicPage.detailModalBody).toContainText(rentBuilding.name);
    await expect(publicPage.detailModalBody).toContainText(/thông tin chung|thong tin chung|general information/i);
    await expect(publicPage.detailModalBody).toContainText(/đặc điểm bất động sản|dac diem bat dong san|property features/i);
    await expect(publicPage.detailModalBody).toContainText(/giá thuê|gia thue|rent price/i);
    await expect(publicPage.detailModalBody).toContainText(/phí dịch vụ|phi dich vu|service fee/i);
    expect(rentBuilding.rentPrice).toBeTruthy();
  });

  test("[E2E-PUB-BLD-010] - Public Building Browsing - Sale Building Details - Sale Price Display Without Rental Fields", async ({ publicPage }) => {
    const saleBuilding = await getSingleVisibleBuilding("b.transaction_type = 'FOR_SALE'");
    test.skip(!saleBuilding, "No public FOR_SALE building is available for this test.");
    if (!saleBuilding) {
      return;
    }

    await publicPage.searchByBuildingName(saleBuilding.name);
    await publicPage.openBuildingDetailsByName(saleBuilding.name);

    await expect(publicPage.detailModalBody).toContainText(saleBuilding.name);
    await expect(publicPage.detailModalBody).toContainText(/giá bán|gia ban|sale price/i);
    await expect(publicPage.detailModalBody).not.toContainText(/diện tích thuê khả dụng|rentable area/i);
    expect(saleBuilding.salePrice).toBeTruthy();
  });

  test("[E2E-PUB-BLD-011] - Public Building Browsing - Building Card Media - Safe Rendering Without Image", async ({ publicPage }) => {
    const buildingWithoutImage = await getSingleVisibleBuilding("(b.image IS NULL OR TRIM(b.image) = '')");
    test.skip(!buildingWithoutImage, "No public building without an image is available for this test.");
    if (!buildingWithoutImage) {
      return;
    }

    await publicPage.searchByBuildingName(buildingWithoutImage.name);

    const targetCard = publicPage.cardByName(buildingWithoutImage.name);
    await expect(targetCard).toBeVisible();
    await expect(targetCard.locator(".building-image img")).toHaveCount(0);
    await expect(targetCard.locator(".building-image .bi-building")).toBeVisible();
  });

  test("[E2E-PUB-BLD-012] - Public Building Browsing - Filter Panel State - Collapsed State Persistence via Local Storage", async ({ publicPage }) => {
    await expect(await publicPage.isFilterCollapsed()).toBeFalsy();

    await publicPage.toggleFilterPanel();
    await expect.poll(() => publicPage.isFilterCollapsed()).toBeTruthy();
    await expect(await publicPage.storedFilterCollapsedValue()).toBe("true");

    await publicPage.open();
    await publicPage.expectResultsLoaded();
    await expect.poll(() => publicPage.isFilterCollapsed()).toBeTruthy();
  });

  test("[E2E-PUB-BLD-013] - Public Building Browsing - Price Range Filter - Zero or Reversed Range Stability", async ({ page, publicPage }) => {
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await publicPage.fillNumberRange("numberOfFloorFrom", "numberOfFloorTo", "0", "0");
    await publicPage.search();
    await expect(dialogMessage).toBe("");

    await publicPage.fillNumberRange("numberOfFloorFrom", "numberOfFloorTo", "10", "1");
    await publicPage.search();
    await expect(dialogMessage).toBe("");
    await expect(publicPage.buildingList).toBeVisible();
  });
});
