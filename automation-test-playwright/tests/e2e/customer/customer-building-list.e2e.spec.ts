import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { CustomerBuildingListPage } from "@pages/customer/CustomerBuildingListPage";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Customer Building List E2E @regression", () => {
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

  test("[E2E-CUS-BLD-001] customer sees assigned building cards", async ({ page }) => {
    const buildingPage = new CustomerBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.waitForBuildingData();
    await expect(buildingPage.cardByBuildingName(tempContract!.building.name)).toBeVisible();
  });

  test("[E2E-CUS-BLD-002] customer can filter by building name and open detail modal", async ({ page }) => {
    const buildingPage = new CustomerBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.filterByName(tempContract!.building.name);
    await buildingPage.submitFilters();
    await buildingPage.waitForBuildingData();
    await buildingPage.openBuildingDetail(tempContract!.building.name);
    await buildingPage.expectDetailModalContains(tempContract!.building.name);
  });

  test("[E2E-CUS-BLD-003] unmatched building search shows empty state", async ({ page }) => {
    const buildingPage = new CustomerBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.filterByName(`no-match-${Date.now()}`);
    await buildingPage.submitFilters();
    await buildingPage.waitForBuildingData();
    await buildingPage.expectEmptyState();
  });
});
