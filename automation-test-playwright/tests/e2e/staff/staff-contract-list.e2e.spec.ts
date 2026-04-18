import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { StaffContractListPage } from "@pages/staff/StaffContractListPage";
import { loginAsTempUser, newAdminApiContext } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Staff - E2E danh sach contract @regression", () => {
  let adminApi: APIRequestContext;
  let tempContract: TempContract | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.staff.username);
    await page.goto("/staff/contracts");
  });

  test.afterEach(async () => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-STF-CTR-001] staff sees duoc giao contracts", async ({ page }) => {
    const contractPage = new StaffContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.waitForTableData();
    await expect(contractPage.rowByContractText(tempContract!.customer.fullName)).toBeVisible();

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM contract WHERE id = ? AND staff_id = ? AND customer_id = ?",
      [tempContract!.id, tempContract!.staff.id, tempContract!.customer.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-STF-CTR-002] staff co loc contract theo customer, building va status", async ({ page }) => {
    const contractPage = new StaffContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.filterByCustomer(tempContract!.customer.id);
    await contractPage.filterByBuilding(tempContract!.building.id);
    await contractPage.filterByStatus("ACTIVE");
    await contractPage.submitFilters();
    await contractPage.waitForTableData();
    await expect(contractPage.rowByContractText(tempContract!.customer.fullName)).toBeVisible();
  });

  test("[E2E-STF-CTR-003] staff co mo contract chi tiet modal tu danh sach", async ({ page }) => {
    const contractPage = new StaffContractListPage(page);
    await contractPage.expectLoaded();
    await contractPage.waitForTableData();
    await contractPage.openContractDetail(tempContract!.customer.fullName);
    await contractPage.expectDetailModalContains(tempContract!.customer.fullName);
  });
});


