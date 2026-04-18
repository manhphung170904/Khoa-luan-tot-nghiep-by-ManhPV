import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { CustomerContractListPage } from "@pages/customer/CustomerContractListPage";
import { loginAsTempUser, newAdminApiContext } from "@data/profileTempUsers";

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

    const rows = await MySqlDbClient.query<{ status: string }>(
      "SELECT status FROM contract WHERE id = ? AND customer_id = ?",
      [tempContract!.id, tempContract!.customer.id]
    );
    expect(rows[0]?.status).toBe("ACTIVE");
  });

  test("[E2E-CUS-CTR-002] customer can filter contracts by building and status", async ({ page }) => {
    const contractPage = new CustomerContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.filterByBuilding(tempContract!.building.id);
    await contractPage.filterByStatus("ACTIVE");
    await contractPage.submitFilters();
    await contractPage.waitForContractData();
    await expect(contractPage.cardByBuildingName(tempContract!.building.name)).toBeVisible();

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM contract
        WHERE id = ? AND building_id = ? AND status = 'ACTIVE'
      `,
      [tempContract!.id, tempContract!.building.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
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


