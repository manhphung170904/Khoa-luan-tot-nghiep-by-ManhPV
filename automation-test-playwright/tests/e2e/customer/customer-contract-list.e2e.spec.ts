import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { CustomerContractListPage } from "@pages/customer/CustomerContractListPage";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Customer Contract List E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempContract: TempContract | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.customer.username);
    await page.goto("/customer/contract/list");
  });

  test.afterEach(async () => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-CTR-001] customer sees current contracts", async ({ page }) => {
    const contractPage = new CustomerContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.waitForContractData();
    await expect(contractPage.cardByBuildingName(tempContract!.building.name)).toBeVisible();
  });

  test("[E2E-CUS-CTR-002] customer can filter contracts by building and status", async ({ page }) => {
    const contractPage = new CustomerContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.filterByBuilding(tempContract!.building.id);
    await contractPage.filterByStatus("ACTIVE");
    await contractPage.submitFilters();
    await contractPage.waitForContractData();
    await expect(contractPage.cardByBuildingName(tempContract!.building.name)).toBeVisible();
  });

  test("[E2E-CUS-CTR-003] unmatched contract filter shows empty state", async ({ page }) => {
    const contractPage = new CustomerContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.filterByStatus("EXPIRED");
    await contractPage.submitFilters();
    await contractPage.waitForContractData();
    await contractPage.expectEmptyState();
  });
});
