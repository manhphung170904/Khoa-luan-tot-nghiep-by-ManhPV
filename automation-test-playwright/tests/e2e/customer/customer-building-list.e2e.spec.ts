import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { CustomerBuildingListPage } from "@pages/customer/CustomerBuildingListPage";
import { loginAsTempUser, newAdminApiContext } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Customer - Building List @regression", () => {
  let adminApi: APIRequestContext;
  let tempContract: TempContract | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.customer.username);
    await page.goto("/customer/building/list");
  });

  test.afterEach(async () => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-BLD-001] - Customer Building List - Assigned Buildings - Assigned Building Display", async ({ page }) => {
    const buildingPage = new CustomerBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.waitForBuildingData();
    await expect(buildingPage.cardByBuildingName(tempContract!.building.name)).toBeVisible();

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM contract
        WHERE id = ? AND customer_id = ? AND building_id = ?
      `,
      [tempContract!.id, tempContract!.customer.id, tempContract!.building.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-CUS-BLD-002] - Customer Building List - Building Search - Name Filter and Details Modal", async ({ page }) => {
    const buildingPage = new CustomerBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.filterByName(tempContract!.building.name);
    await buildingPage.submitFilters();
    await buildingPage.waitForBuildingData();
    await buildingPage.openBuildingDetail(tempContract!.building.name);
    await buildingPage.expectDetailModalContains(tempContract!.building.name);

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM building
        WHERE id = ? AND name = ?
      `,
      [tempContract!.building.id, tempContract!.building.name]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-CUS-BLD-003] - Customer Building List - Building Search - Empty State for Unmatched Search", async ({ page }) => {
    const buildingPage = new CustomerBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.filterByName(`no-match-${Date.now()}`);
    await buildingPage.submitFilters();
    await buildingPage.waitForBuildingData();
    await buildingPage.expectEmptyState();
  });
});


