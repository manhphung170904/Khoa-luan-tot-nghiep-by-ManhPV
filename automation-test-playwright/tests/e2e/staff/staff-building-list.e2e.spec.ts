import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { StaffBuildingListPage } from "@pages/staff/StaffBuildingListPage";
import { loginAsTempUser } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Staff - Building List @regression", () => {
  let tempContract: TempContract | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.staff.username);
    await page.goto("/staff/buildings", { waitUntil: "domcontentloaded" });
  });

  test.afterEach(async ({ adminApi }) => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test("[E2E-STF-BLD-001] - Staff Building List - Assigned Buildings - Assigned Building Display", async ({ page }) => {
    const buildingPage = new StaffBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.waitForBuildingData();
    await expect(buildingPage.cardByBuildingName(tempContract!.building.name)).toBeVisible();

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM contract WHERE id = ? AND staff_id = ? AND building_id = ?",
      [tempContract!.id, tempContract!.staff.id, tempContract!.building.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-STF-BLD-002] - Staff Building List - Building Search - Name Filter and Details Modal", async ({ page }) => {
    const buildingPage = new StaffBuildingListPage(page);
    await buildingPage.expectLoaded();
    await buildingPage.filterByName(tempContract!.building.name);
    await buildingPage.submitFilters();
    await buildingPage.waitForBuildingData();
    await buildingPage.openBuildingDetail(tempContract!.building.name);
    await buildingPage.expectDetailModalContains(tempContract!.building.name);
  });
});
