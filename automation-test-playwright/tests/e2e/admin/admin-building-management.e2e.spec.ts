import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminBuildingDetailPage } from "@pages/admin/AdminBuildingDetailPage";
import { AdminBuildingFormPage } from "@pages/admin/AdminBuildingFormPage";
import { AdminBuildingListPage } from "@pages/admin/AdminBuildingListPage";
import {
  cleanupTempBuildingIds,
  cleanupTempContracts,
  createAdminE2ESession,
  type AdminE2ESession
} from "@data/e2eAdminScenario";

test.describe("Admin - Building Management @regression", () => {
  let adminSession: AdminE2ESession | null = null;
  const cleanupBuildingIds = new Set<number>();
  const cleanupContracts: Array<Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>> = [];

  test.beforeEach(async ({ page, adminApi }) => {
    adminSession = await createAdminE2ESession(page, adminApi, "/admin/building/list");
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupTempContracts(adminApi, cleanupContracts);
    await cleanupTempBuildingIds(adminApi, cleanupBuildingIds);
    await adminSession?.cleanup();
    adminSession = null;
  });

  test("[E2E-ADM-BLD-001] - Admin Building Management - Building Search - Filter and Detail View", async ({ page, adminApi }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, TestDataFactory.transactionType.rent);
    cleanupBuildingIds.add(tempBuilding.id);

    const listPage = new AdminBuildingListPage(page);
    const detailPage = new AdminBuildingDetailPage(page);

    await page.goto("/admin/building/list");
    await listPage.expectLoaded();
    await listPage.filterByName(tempBuilding.name);
    await listPage.filterByTransactionType(TestDataFactory.transactionType.rent);
    await listPage.search();
    await listPage.waitForTableData();

    await expect(listPage.rowByBuildingName(tempBuilding.name)).toBeVisible();
    await listPage.openDetail(tempBuilding.name);
    await detailPage.expectLoaded(tempBuilding.id);
  });

  test("[E2E-ADM-BLD-002] - Admin Building Management - Building Creation - Rental Building Creation", async ({ page }) => {
    const listPage = new AdminBuildingListPage(page);
    const formPage = new AdminBuildingFormPage(page);
    const buildingName = TestDataFactory.taoTenToaNha("E2E Building");
    const taxCode = TestDataFactory.taoMaSo("TAX", 10);

    await page.goto("/admin/building/list");
    await listPage.openAddForm();
    await formPage.expectAddLoaded();
    await formPage.setTransactionType(TestDataFactory.transactionType.rent);
    await formPage.fillCommonFields({
      name: buildingName,
      districtId: "1",
      ward: "Xuan La",
      street: "Vo Chi Cong",
      numberOfFloor: 12,
      numberOfBasement: 2,
      floorArea: 450,
      level: "A",
      direction: "DONG",
      taxCode,
      linkOfBuilding: "https://example.com/building"
    });
    await formPage.fillRentFields({
      rentPrice: 1200000,
      deposit: 2400000,
      serviceFee: 100000,
      carFee: 50000,
      motorbikeFee: 20000,
      waterFee: 15000,
      electricityFee: 3500,
      rentAreaValues: "50,100"
    });
    await formPage.setCoordinates(21.0686, 105.8033);
    await formPage.submit();
    await formPage.expectSweetAlertContains(/thanh cong|success/i);

    const rows = await MySqlDbClient.query<{ id: number; transaction_type: string; floor_area: number; tax_code: string }>(
      `
        SELECT id, transaction_type, floor_area, tax_code
        FROM building
        WHERE name = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [buildingName]
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.transaction_type).toBe(TestDataFactory.transactionType.rent);
    expect(Number(rows[0]!.floor_area)).toBe(450);
    expect(rows[0]!.tax_code).toBe(taxCode);
    cleanupBuildingIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-BLD-003] - Admin Building Management - Building Edit - Unlocked Building Update", async ({ page, adminApi }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, TestDataFactory.transactionType.rent);
    cleanupBuildingIds.add(tempBuilding.id);

    const formPage = new AdminBuildingFormPage(page);
    const updatedName = `${tempBuilding.name} Updated`;

    await page.goto(`/admin/building/edit/${tempBuilding.id}`);
    await formPage.expectEditLoaded(tempBuilding.id);
    await formPage.fillCommonFields({
      name: updatedName,
      numberOfFloor: 15,
      floorArea: 999
    });
    await formPage.fillRentFields({
      rentPrice: 1300000,
      deposit: 2500000,
      serviceFee: 110000,
      carFee: 60000,
      motorbikeFee: 30000,
      waterFee: 18000,
      electricityFee: 4000,
      rentAreaValues: "70,140"
    });
    await formPage.submit();
    await formPage.expectSweetAlertContains(/thanh cong|success/i);

    const rows = await MySqlDbClient.query<{ name: string; floor_area: number; rent_price: number }>(
      "SELECT name, floor_area, rent_price FROM building WHERE id = ?",
      [tempBuilding.id]
    );
    expect(rows[0]?.name).toBe(updatedName);
    expect(Number(rows[0]?.floor_area ?? 0)).toBe(999);
    expect(Number(rows[0]?.rent_price ?? 0)).toBe(1300000);
  });

  test("[E2E-ADM-BLD-004] - Admin Building Management - Building Edit Lock - Active Contract Lock Banner Display", async ({ page, adminApi }) => {
    const tempContract = await TempEntityHelper.taoContractTam(adminApi);
    cleanupContracts.push(tempContract);

    const formPage = new AdminBuildingFormPage(page);
    await page.goto(`/admin/building/edit/${tempContract.building.id}`);
    await formPage.expectEditLoaded(tempContract.building.id);
    await formPage.expectLockBanner();
  });

  test("[E2E-ADM-BLD-005] - Admin Building Management - Building Deletion - Unlocked Building Deletion from List", async ({ page, adminApi }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, TestDataFactory.transactionType.rent);

    const listPage = new AdminBuildingListPage(page);
    await page.goto("/admin/building/list");
    await listPage.filterByName(tempBuilding.name);
    await listPage.search();
    await listPage.waitForTableData();
    await listPage.deleteBuilding(tempBuilding.name);
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM building WHERE id = ?", [tempBuilding.id]);
      return rows.length;
    }).toBe(0);
  });
});
