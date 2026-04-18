import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";

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

test.describe("E2E Public Building Browsing @regression", () => {
  test.beforeEach(async ({ publicPage }) => {
    await publicPage.open();
    await publicPage.expectResultsLoaded();
  });

  test.afterAll(async () => {
    await MySqlDbClient.close();
  });

  test("[E2E-001] Public landing page renders default filters and initial result list", async ({ page, publicPage }) => {
    const total = await getVisibleBuildingCount();
    expect(total).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/moonnest$/);
    await expect(publicPage.filterForm).toBeVisible();
    await expect(publicPage.searchButton).toBeVisible();
    await publicPage.expectHasResults();
    await expect(await publicPage.resultSummaryText()).toMatch(/Tìm thấy/i);
  });

  test("[E2E-002] buildingName query pre-fills and auto-applies initial search", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding();
    test.skip(!targetBuilding, "Khong co du lieu building public de test.");
    if (!targetBuilding) {
      return;
    }

    await publicPage.open(`buildingName=${encodeURIComponent(targetBuilding.name)}`);
    await publicPage.expectResultsLoaded();

    await expect(publicPage.buildingNameInput).toHaveValue(targetBuilding.name);
    await expect(publicPage.cardByName(targetBuilding.name)).toBeVisible();
  });

  test("[E2E-003] filter metadata dropdowns are populated from the public filters API", async ({ publicPage }) => {
    await expect.poll(() => publicPage.optionCount("districtId")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("ward")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("street")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("direction")).toBeGreaterThan(1);
    await expect.poll(() => publicPage.optionCount("level")).toBeGreaterThan(1);
  });

  test("[E2E-004] search by exact building name returns the matching public card", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding();
    test.skip(!targetBuilding, "Khong co du lieu building public de test.");
    if (!targetBuilding) {
      return;
    }

    await publicPage.searchByBuildingName(targetBuilding.name);

    await expect(publicPage.cardByName(targetBuilding.name)).toBeVisible();
    expect(await publicPage.cardCount()).toBeGreaterThan(0);
  });

  test("[E2E-005] searching by district narrows down to buildings from that district", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding("b.district_id IS NOT NULL");
    test.skip(!targetBuilding?.districtId, "Khong co building public co district de test.");
    if (!targetBuilding?.districtId) {
      return;
    }

    await publicPage.selectDistrict(String(targetBuilding.districtId));
    await publicPage.search();

    await expect(publicPage.cardByName(targetBuilding.name)).toBeVisible();
    await publicPage.openBuildingDetailsByName(targetBuilding.name);
    await expect(publicPage.detailModalBody).toContainText(targetBuilding.districtName ?? "");
  });

  test("[E2E-006] reset clears entered filters back to the default state", async ({ publicPage }) => {
    const targetBuilding = await getSingleVisibleBuilding("b.district_id IS NOT NULL");
    test.skip(!targetBuilding?.districtId, "Khong co building public co district de test.");
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

  test("[E2E-007] a no-match search shows the empty state message", async ({ publicPage }) => {
    await publicPage.searchByBuildingName(`ZZZ-E2E-NO-MATCH-${Date.now()}`);

    await publicPage.expectEmptyState();
  });

  test("[E2E-008] pagination appears for multi-page results and page switching updates the active page", async ({ publicPage }) => {
    const total = await getVisibleBuildingCount();
    test.skip(total <= 9, "So luong building public hien tai chua vuot qua 1 trang.");

    const firstPageNames = await publicPage.cardNames();
    expect(firstPageNames.length).toBeGreaterThan(0);

    await expect(publicPage.paginationContainer).toBeVisible();
    expect(await publicPage.paginationCount()).toBeGreaterThan(1);

    await publicPage.clickPaginationPage(2);

    await expect(publicPage.paginationButton(2)).toBeVisible();
    await expect(await publicPage.activePaginationText()).toBe("2");
    const secondPageNames = await publicPage.cardNames();
    expect(secondPageNames.length).toBeGreaterThan(0);
    expect(secondPageNames.join("|")).not.toBe(firstPageNames.join("|"));
  });

  test("[E2E-009] clicking a rental building opens the detail modal with core information and pricing", async ({ publicPage }) => {
    const rentBuilding = await getSingleVisibleBuilding("b.transaction_type = 'FOR_RENT'");
    test.skip(!rentBuilding, "Khong co building FOR_RENT public de test.");
    if (!rentBuilding) {
      return;
    }

    await publicPage.searchByBuildingName(rentBuilding.name);
    await publicPage.openBuildingDetailsByName(rentBuilding.name);

    await expect(publicPage.detailModalBody).toContainText(rentBuilding.name);
    await expect(publicPage.detailModalBody).toContainText(/Thông Tin Chung/i);
    await expect(publicPage.detailModalBody).toContainText(/Đặc Điểm Bất Động Sản/i);
    await expect(publicPage.detailModalBody).toContainText(/Giá thuê/i);
    await expect(publicPage.detailModalBody).toContainText(/Phí dịch vụ/i);
  });

  test("[E2E-010] sale building modal shows sale pricing instead of rental-only sections", async ({ publicPage }) => {
    const saleBuilding = await getSingleVisibleBuilding("b.transaction_type = 'FOR_SALE'");
    test.skip(!saleBuilding, "Khong co building FOR_SALE public de test.");
    if (!saleBuilding) {
      return;
    }

    await publicPage.searchByBuildingName(saleBuilding.name);
    await publicPage.openBuildingDetailsByName(saleBuilding.name);

    await expect(publicPage.detailModalBody).toContainText(saleBuilding.name);
    await expect(publicPage.detailModalBody).toContainText(/Giá bán/i);
    await expect(publicPage.detailModalBody).not.toContainText(/Diện Tích Thuê Khả Dụng/i);
  });

  test("[E2E-011] building cards without an image still render safely", async ({ publicPage }) => {
    const buildingWithoutImage = await getSingleVisibleBuilding("(b.image IS NULL OR TRIM(b.image) = '')");
    test.skip(!buildingWithoutImage, "Khong co building public khong co image de test.");
    if (!buildingWithoutImage) {
      return;
    }

    await publicPage.searchByBuildingName(buildingWithoutImage.name);

    const targetCard = publicPage.cardByName(buildingWithoutImage.name);
    await expect(targetCard).toBeVisible();
    await expect(targetCard.locator(".building-image img")).toHaveCount(0);
    await expect(targetCard.locator(".building-image .bi-building")).toBeVisible();
  });

  test("[E2E-012] filter panel collapse state persists after reload via localStorage", async ({ publicPage }) => {
    await expect(await publicPage.isFilterCollapsed()).toBeFalsy();

    await publicPage.toggleFilterPanel();
    await expect.poll(() => publicPage.isFilterCollapsed()).toBeTruthy();
    await expect(await publicPage.storedFilterCollapsedValue()).toBe("true");

    await publicPage.open();
    await publicPage.expectResultsLoaded();
    await expect.poll(() => publicPage.isFilterCollapsed()).toBeTruthy();
  });

  test("[E2E-013] zero and inverted numeric ranges do not break the UI search flow", async ({ page, publicPage }) => {
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
