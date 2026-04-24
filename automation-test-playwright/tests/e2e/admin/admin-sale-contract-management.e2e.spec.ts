import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { AdminSaleContractDetailPage } from "@pages/admin/AdminSaleContractDetailPage";
import { AdminSaleContractFormPage } from "@pages/admin/AdminSaleContractFormPage";
import { AdminSaleContractListPage } from "@pages/admin/AdminSaleContractListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

type TempStaff = Awaited<ReturnType<typeof TempEntityHelper.taoStaffTam>>;
type TempCustomer = Awaited<ReturnType<typeof TempEntityHelper.taoCustomerTam>>;
type TempBuilding = Awaited<ReturnType<typeof TempEntityHelper.taoBuildingTam>>;
type TempSaleContract = Awaited<ReturnType<typeof TempEntityHelper.taoSaleContractTam>>;

test.describe("Admin - Sale Contract Management @regression", () => {
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupSaleContractIds = new Set<number>();
  const cleanupCustomerIds = new Set<number>();
  const cleanupBuildingIds = new Set<number>();
  const cleanupStaffIds = new Set<number>();

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/sale-contract/list");
  });

  test.afterEach(async ({ adminApi }) => {
    for (const contractId of cleanupSaleContractIds) {
      await adminApi.delete(`/api/v1/admin/sale-contracts/${contractId}`, { failOnStatusCode: false });
    }
    cleanupSaleContractIds.clear();

    for (const staffId of cleanupStaffIds) {
      await adminApi.put(`/api/v1/admin/staff/${staffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      await adminApi.put(`/api/v1/admin/staff/${staffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
    }

    for (const customerId of cleanupCustomerIds) {
      await TempEntityHelper.xoaCustomerTam(adminApi, customerId);
    }
    cleanupCustomerIds.clear();

    for (const buildingId of cleanupBuildingIds) {
      await TempEntityHelper.xoaBuildingTam(adminApi, buildingId);
    }
    cleanupBuildingIds.clear();

    for (const staffId of cleanupStaffIds) {
      await TempEntityHelper.xoaStaffTam(adminApi, staffId);
    }
    cleanupStaffIds.clear();

    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  async function createAssignableScenario(adminApi: APIRequestContext): Promise<{
    staff: TempStaff;
    customer: TempCustomer;
    building: TempBuilding;
  }> {
    const staff = await TempEntityHelper.taoStaffTam(adminApi);
    cleanupStaffIds.add(staff.id);
    const building = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_SALE");
    cleanupBuildingIds.add(building.id);
    await TempEntityHelper.capNhatPhanCongBuilding(adminApi, staff.id, [building.id]);
    const customer = await TempEntityHelper.taoCustomerTam(adminApi, staff.id);
    cleanupCustomerIds.add(customer.id);
    await TempEntityHelper.capNhatPhanCongCustomer(adminApi, staff.id, [customer.id]);
    return { staff, customer, building };
  }

  test("[E2E-ADM-SCT-001] - Admin Sale Contract Management - Sale Contract Search - Search and Detail View", async ({ page, adminApi }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(adminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const listPage = new AdminSaleContractListPage(page);
    const detailPage = new AdminSaleContractDetailPage(page);

    await page.goto(`/admin/sale-contract/search?customerId=${tempSaleContract.customer.id}&buildingId=${tempSaleContract.building.id}`);
    await listPage.expectLoaded();
    await listPage.waitForTableData();
    await expect(listPage.rowBySaleContractText(tempSaleContract.customer.fullName)).toBeVisible();
    await listPage.openDetail(tempSaleContract.customer.fullName);
    await detailPage.expectLoaded(tempSaleContract.id);
  });

  test("[E2E-ADM-SCT-002] - Admin Sale Contract Management - Sale Contract Creation - Create Sale Contract from Add Form", async ({ page, adminApi }) => {
    const scenario = await createAssignableScenario(adminApi);
    const formPage = new AdminSaleContractFormPage(page);

    await page.goto("/admin/sale-contract/add");
    await formPage.expectAddLoaded();
    await formPage.selectBuilding(scenario.building.id);
    await formPage.selectCustomer(scenario.customer.id);
    await formPage.waitForStaffOptions();
    await formPage.selectStaff(scenario.staff.id);
    await formPage.fillSalePrice(3600000000);
    await formPage.fillNote("Playwright sale contract note");
    await formPage.submitSaleContract();
    await formPage.expectSweetAlertContains(/thanh cong|them hop dong|success/i);

    const rows = await MySqlDbClient.query<{ id: number; sale_price: number }>(
      `
        SELECT id, sale_price
        FROM sale_contract
        WHERE customer_id = ? AND building_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [scenario.customer.id, scenario.building.id]
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0]!.sale_price)).toBe(3600000000);
    cleanupSaleContractIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-SCT-003] - Admin Sale Contract Management - Transfer Date - Edit Form Update", async ({ page, adminApi }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(adminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const formPage = new AdminSaleContractFormPage(page);
    await page.goto(`/admin/sale-contract/edit/${tempSaleContract.id}`);
    await formPage.expectEditLoaded(tempSaleContract.id);
    await formPage.fillTransferDate("2026-06-16");
    await formPage.submitSaleContract();
    await formPage.expectSweetAlertContains(/thanh cong|cap nhat|success/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ transfer_date: string }>(
        "SELECT DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transfer_date FROM sale_contract WHERE id = ?",
        [tempSaleContract.id]
      );
      return rows[0]?.transfer_date ?? "";
    }).toBe("2026-06-16");
  });

  test("[E2E-ADM-SCT-004] - Admin Sale Contract Management - Transfer Date - Earlier Than Signed Date Validation", async ({ page, adminApi }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(adminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const beforeRows = await MySqlDbClient.query<{ transfer_date: string | null }>(
      "SELECT DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transfer_date FROM sale_contract WHERE id = ?",
      [tempSaleContract.id]
    );

    const formPage = new AdminSaleContractFormPage(page);
    await page.goto(`/admin/sale-contract/edit/${tempSaleContract.id}`);
    await formPage.expectEditLoaded(tempSaleContract.id);
    await formPage.fillTransferDate("2025-01-01");
    await formPage.submitSaleContract();
    await formPage.expectSweetAlertContains(/ngay ban giao|khong hop le|transfer date/i);

    const afterRows = await MySqlDbClient.query<{ transfer_date: string | null }>(
      "SELECT DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transfer_date FROM sale_contract WHERE id = ?",
      [tempSaleContract.id]
    );
    expect(afterRows[0]?.transfer_date ?? null).toBe(beforeRows[0]?.transfer_date ?? null);
  });

  test("[E2E-ADM-SCT-005] - Admin Sale Contract Management - Sale Contract Deletion - Detail Page Deletion", async ({ page, adminApi }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(adminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const detailPage = new AdminSaleContractDetailPage(page);
    await page.goto(`/admin/sale-contract/${tempSaleContract.id}`);
    await detailPage.expectLoaded(tempSaleContract.id);
    await detailPage.deleteSaleContract();
    await detailPage.confirmSweetAlert();
    await detailPage.expectSweetAlertContains(/thanh cong|xoa hop dong mua ban|success/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM sale_contract WHERE id = ?", [tempSaleContract.id]);
      return rows.length;
    }).toBe(0);

    cleanupSaleContractIds.delete(tempSaleContract.id);
  });
});
