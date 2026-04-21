import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { AdminContractDetailPage } from "@pages/admin/AdminContractDetailPage";
import { AdminContractFormPage } from "@pages/admin/AdminContractFormPage";
import { AdminContractListPage } from "@pages/admin/AdminContractListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

type TempStaff = Awaited<ReturnType<typeof TempEntityHelper.taoStaffTam>>;
type TempCustomer = Awaited<ReturnType<typeof TempEntityHelper.taoCustomerTam>>;
type TempBuilding = Awaited<ReturnType<typeof TempEntityHelper.taoBuildingTam>>;
type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Admin - Contract Management @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupContractIds = new Set<number>();
  const cleanupCustomerIds = new Set<number>();
  const cleanupBuildingIds = new Set<number>();
  const cleanupStaffIds = new Set<number>();

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/contract/list");
  });

  test.afterEach(async () => {
    for (const contractId of cleanupContractIds) {
      await bootstrapAdminApi.delete(`/api/v1/admin/contracts/${contractId}`, { failOnStatusCode: false });
    }
    cleanupContractIds.clear();

    for (const staffId of cleanupStaffIds) {
      await bootstrapAdminApi.put(`/api/v1/admin/staff/${staffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      await bootstrapAdminApi.put(`/api/v1/admin/staff/${staffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
    }

    for (const customerId of cleanupCustomerIds) {
      await TempEntityHelper.xoaCustomerTam(bootstrapAdminApi, customerId);
    }
    cleanupCustomerIds.clear();

    for (const buildingId of cleanupBuildingIds) {
      await TempEntityHelper.xoaBuildingTam(bootstrapAdminApi, buildingId);
    }
    cleanupBuildingIds.clear();

    for (const staffId of cleanupStaffIds) {
      await TempEntityHelper.xoaStaffTam(bootstrapAdminApi, staffId);
    }
    cleanupStaffIds.clear();

    await cleanupTempStaffProfileUser(bootstrapAdminApi, adminUser);
    adminUser = null;
  });

  test.afterAll(async () => {
    await bootstrapAdminApi.dispose();
    await MySqlDbClient.close();
  });

  async function createAssignableScenario(): Promise<{
    staff: TempStaff;
    customer: TempCustomer;
    building: TempBuilding;
  }> {
    const staff = await TempEntityHelper.taoStaffTam(bootstrapAdminApi);
    cleanupStaffIds.add(staff.id);
    const building = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_RENT");
    cleanupBuildingIds.add(building.id);
    await TempEntityHelper.capNhatPhanCongBuilding(bootstrapAdminApi, staff.id, [building.id]);
    const customer = await TempEntityHelper.taoCustomerTam(bootstrapAdminApi, staff.id);
    cleanupCustomerIds.add(customer.id);
    await TempEntityHelper.capNhatPhanCongCustomer(bootstrapAdminApi, staff.id, [customer.id]);
    return { staff, customer, building };
  }

  test("[E2E-ADM-CTR-001] - Admin Contract Management - Contract Search - Search and Detail View", async ({ page }) => {
    const tempContract: TempContract = await TempEntityHelper.taoContractTam(bootstrapAdminApi);
    cleanupContractIds.add(tempContract.id);
    cleanupStaffIds.add(tempContract.staff.id);
    cleanupBuildingIds.add(tempContract.building.id);
    cleanupCustomerIds.add(tempContract.customer.id);

    const listPage = new AdminContractListPage(page);
    const detailPage = new AdminContractDetailPage(page);

    await page.goto(`/admin/contract/search?customerId=${tempContract.customer.id}&buildingId=${tempContract.building.id}`);
    await listPage.expectLoaded();
    await listPage.waitForTableData();
    await expect(listPage.rowByContractText(tempContract.customer.fullName)).toBeVisible();
    await listPage.openDetail(tempContract.customer.fullName);
    await detailPage.expectLoaded(tempContract.id);
  });

  test("[E2E-ADM-CTR-002] - Admin Contract Management - Contract Creation - Create Contract from Add Form", async ({ page }) => {
    const scenario = await createAssignableScenario();
    const formPage = new AdminContractFormPage(page);

    await page.goto("/admin/contract/add");
    await formPage.expectAddLoaded();
    await formPage.selectBuilding(scenario.building.id);
    await formPage.waitForRentAreaOptions();
    await formPage.selectCustomer(scenario.customer.id);
    await formPage.waitForStaffOptions();
    await formPage.selectRentArea("50");
    await formPage.selectStaff(scenario.staff.id);
    await formPage.fillRentPrice(1450000);
    await formPage.fillDates("2026-06-01", "2026-12-31");
    await formPage.submitContract();
    await formPage.expectSweetAlertContains(/thành công|thanh cong|thêm hợp đồng|them hop dong|success/i);

    const rows = await MySqlDbClient.query<{ id: number; rent_price: number; start_date: string; end_date: string }>(
      `
        SELECT id, rent_price,
               DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
               DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
        FROM contract
        WHERE customer_id = ? AND building_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [scenario.customer.id, scenario.building.id]
    );

    expect(rows.length).toBe(1);
    expect(Number(rows[0]!.rent_price)).toBe(1450000);
    expect(rows[0]!.start_date).toBe("2026-06-01");
    expect(rows[0]!.end_date).toBe("2026-12-31");
    cleanupContractIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-CTR-003] - Admin Contract Management - Contract Dates - Invalid Date Range Validation", async ({ page }) => {
    const scenario = await createAssignableScenario();
    const formPage = new AdminContractFormPage(page);

    await page.goto("/admin/contract/add");
    await formPage.expectAddLoaded();
    await formPage.selectBuilding(scenario.building.id);
    await formPage.waitForRentAreaOptions();
    await formPage.selectCustomer(scenario.customer.id);
    await formPage.waitForStaffOptions();
    await formPage.selectRentArea("50");
    await formPage.selectStaff(scenario.staff.id);
    await formPage.fillRentPrice(1500000);
    await formPage.fillDates("2026-09-01", "2026-08-01");
    await formPage.submitContract();
    await formPage.expectSweetAlertContains(/ngày kết thúc|ngay ket thuc|cảnh báo|canh bao|warning/i);

    const rows = await MySqlDbClient.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM contract WHERE customer_id = ? AND building_id = ? AND rent_price = ?",
      [scenario.customer.id, scenario.building.id, 1500000]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[E2E-ADM-CTR-004] - Admin Contract Management - Contract Edit - Active Contract Update", async ({ page }) => {
    const tempContract: TempContract = await TempEntityHelper.taoContractTam(bootstrapAdminApi);
    cleanupContractIds.add(tempContract.id);
    cleanupStaffIds.add(tempContract.staff.id);
    cleanupBuildingIds.add(tempContract.building.id);
    cleanupCustomerIds.add(tempContract.customer.id);

    const formPage = new AdminContractFormPage(page);
    await page.goto(`/admin/contract/edit/${tempContract.id}`);
    await formPage.expectEditLoaded(tempContract.id);
    await formPage.fillDates("2026-01-15", "2026-11-30");
    await formPage.fillRentPrice(2500000);
    await formPage.selectStatus("ACTIVE");
    await formPage.submitContract();
    await formPage.expectSweetAlertContains(/thành công|thanh cong|cập nhật|cap nhat|success/i);

    const rows = await MySqlDbClient.query<{ rent_price: number; end_date: string; status: string }>(
      "SELECT rent_price, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, status FROM contract WHERE id = ?",
      [tempContract.id]
    );
    expect(Number(rows[0]!.rent_price)).toBe(2500000);
    expect(rows[0]!.end_date).toBe("2026-11-30");
    expect(rows[0]!.status).toBe("ACTIVE");
  });

  test("[E2E-ADM-CTR-005] - Admin Contract Management - Contract Edit Lock - Expired Contract Lock Banner Display", async ({ page }) => {
    const tempContract: TempContract = await TempEntityHelper.taoContractTam(bootstrapAdminApi);
    cleanupContractIds.add(tempContract.id);
    cleanupStaffIds.add(tempContract.staff.id);
    cleanupBuildingIds.add(tempContract.building.id);
    cleanupCustomerIds.add(tempContract.customer.id);

    await MySqlDbClient.execute("UPDATE contract SET status = 'EXPIRED' WHERE id = ?", [tempContract.id]);

    const formPage = new AdminContractFormPage(page);
    await page.goto(`/admin/contract/edit/${tempContract.id}`);
    await formPage.expectEditLoaded(tempContract.id);
    await formPage.expectExpiredBanner();
  });

  test("[E2E-ADM-CTR-006] - Admin Contract Management - Contract Deletion - Detail Page Deletion", async ({ page }) => {
    const tempContract: TempContract = await TempEntityHelper.taoContractTam(bootstrapAdminApi);
    cleanupContractIds.add(tempContract.id);
    cleanupStaffIds.add(tempContract.staff.id);
    cleanupBuildingIds.add(tempContract.building.id);
    cleanupCustomerIds.add(tempContract.customer.id);

    const detailPage = new AdminContractDetailPage(page);
    await page.goto(`/admin/contract/${tempContract.id}`);
    await detailPage.expectLoaded(tempContract.id);
    await detailPage.deleteContract();
    await detailPage.confirmSweetAlert();
    await detailPage.expectSweetAlertContains(/thành công|thanh cong|xóa hợp đồng|xoa hop dong|success/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM contract WHERE id = ?", [tempContract.id]);
      return rows.length;
    }).toBe(0);

    cleanupContractIds.delete(tempContract.id);
  });
});


