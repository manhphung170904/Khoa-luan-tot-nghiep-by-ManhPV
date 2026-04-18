import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { StaffSaleContractListPage } from "@pages/staff/StaffSaleContractListPage";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempSaleContract = Awaited<ReturnType<typeof TempEntityHelper.taoSaleContractTam>>;

test.describe("Staff Sale Contract List E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempSaleContract: TempSaleContract | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempSaleContract = await TempEntityHelper.taoSaleContractTam(adminApi);
    await loginAsTempUser(page, tempSaleContract.staff.username);
    await page.goto("/staff/sale-contracts");
  });

  test.afterEach(async () => {
    await TempEntityHelper.xoaSaleContractTam(adminApi, tempSaleContract ?? undefined);
    tempSaleContract = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-STF-SALE-001] staff sees assigned sale contracts in list", async ({ page }) => {
    const saleContractPage = new StaffSaleContractListPage(page);
    await saleContractPage.expectLoaded();
    await saleContractPage.waitForTableData();
    await saleContractPage.expectRowVisible(tempSaleContract!.building.name);

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sale_contract WHERE id = ? AND staff_id = ? AND customer_id = ? AND building_id = ?",
      [tempSaleContract!.id, tempSaleContract!.staff.id, tempSaleContract!.customer.id, tempSaleContract!.building.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-STF-SALE-002] staff can filter sale contracts by customer and building", async ({ page }) => {
    const saleContractPage = new StaffSaleContractListPage(page);
    await saleContractPage.expectLoaded();
    await saleContractPage.filterByCustomerId(tempSaleContract!.customer.id);
    await saleContractPage.filterByBuildingId(tempSaleContract!.building.id);
    await saleContractPage.submitFilters();
    await saleContractPage.expectRowVisible(tempSaleContract!.building.name);
  });

  test("[E2E-STF-SALE-003] staff can open sale contract detail modal", async ({ page }) => {
    const saleContractPage = new StaffSaleContractListPage(page);
    await saleContractPage.expectLoaded();
    await saleContractPage.openDetail(tempSaleContract!.building.name);
    await saleContractPage.expectDetailModalContains(tempSaleContract!.customer.fullName);
    await saleContractPage.expectDetailModalContains(tempSaleContract!.building.name);
    await saleContractPage.closeDetailModal();
  });
});


