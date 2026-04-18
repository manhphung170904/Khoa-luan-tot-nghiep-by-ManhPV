import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminBuildingDetailPage } from "@pages/admin/AdminBuildingDetailPage";
import { AdminBuildingFormPage } from "@pages/admin/AdminBuildingFormPage";
import { AdminBuildingListPage } from "@pages/admin/AdminBuildingListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Admin Building Management E2E @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupBuildingIds = new Set<number>();
  const cleanupContracts: Array<Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>> = [];

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/building/list");
  });

  test.afterEach(async () => {
    for (const contract of cleanupContracts.splice(0)) {
      await TempEntityHelper.xoaContractTam(bootstrapAdminApi, contract);
    }

    for (const buildingId of cleanupBuildingIds) {
      await TempEntityHelper.xoaBuildingTam(bootstrapAdminApi, buildingId);
    }
    cleanupBuildingIds.clear();

    await cleanupTempStaffProfileUser(bootstrapAdminApi, adminUser);
    adminUser = null;
  });

  test.afterAll(async () => {
    await bootstrapAdminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-ADM-BLD-001] admin can filter buildings and open detail from search results", async ({ page }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_RENT");
    cleanupBuildingIds.add(tempBuilding.id);

    const listPage = new AdminBuildingListPage(page);
    const detailPage = new AdminBuildingDetailPage(page);

    await page.goto("/admin/building/list");
    await listPage.expectLoaded();
    await listPage.filterByName(tempBuilding.name);
    await listPage.filterByTransactionType("FOR_RENT");
    await listPage.search();
    await listPage.waitForTableData();

    await expect(listPage.rowByBuildingName(tempBuilding.name)).toBeVisible();
    await listPage.openDetail(tempBuilding.name);
    await detailPage.expectLoaded(tempBuilding.id);
  });

  test("[E2E-ADM-BLD-002] admin can create a new rental building from the add form", async ({ page }) => {
    const listPage = new AdminBuildingListPage(page);
    const formPage = new AdminBuildingFormPage(page);
    const buildingName = TestDataFactory.taoTenToaNha("E2E Building");
    const taxCode = `TAX-${Date.now()}`;

    await page.goto("/admin/building/list");
    await listPage.openAddForm();
    await formPage.expectAddLoaded();
    await formPage.setTransactionType("FOR_RENT");
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
    await formPage.expectSweetAlertContains(/thành công|thanh cong/i);

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
    expect(rows[0]!.transaction_type).toBe("FOR_RENT");
    expect(Number(rows[0]!.floor_area)).toBe(450);
    expect(rows[0]!.tax_code).toBe(taxCode);
    cleanupBuildingIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-BLD-003] admin can edit an unlocked building", async ({ page }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_RENT");
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
    await formPage.expectSweetAlertContains(/thành công|thanh cong/i);

    const rows = await MySqlDbClient.query<{ name: string; floor_area: number; rent_price: number }>(
      "SELECT name, floor_area, rent_price FROM building WHERE id = ?",
      [tempBuilding.id]
    );
    expect(rows[0]?.name).toBe(updatedName);
    expect(Number(rows[0]?.floor_area ?? 0)).toBe(999);
    expect(Number(rows[0]?.rent_price ?? 0)).toBe(1300000);
  });

  test("[E2E-ADM-BLD-004] active-contract building edit page shows the lock banner", async ({ page }) => {
    const tempContract = await TempEntityHelper.taoContractTam(bootstrapAdminApi);
    cleanupContracts.push(tempContract);

    const formPage = new AdminBuildingFormPage(page);
    await page.goto(`/admin/building/edit/${tempContract.building.id}`);
    await formPage.expectEditLoaded(tempContract.building.id);
    await formPage.expectLockBanner();
  });

  test("[E2E-ADM-BLD-005] admin can delete an unlocked building from the list", async ({ page }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_RENT");

    const listPage = new AdminBuildingListPage(page);
    await page.goto("/admin/building/list");
    await listPage.filterByName(tempBuilding.name);
    await listPage.search();
    await listPage.waitForTableData();
    await listPage.deleteBuilding(tempBuilding.name);
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/thành công|thanh cong/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM building WHERE id = ?", [tempBuilding.id]);
      return rows.length;
    }).toBe(0);
  });
});
