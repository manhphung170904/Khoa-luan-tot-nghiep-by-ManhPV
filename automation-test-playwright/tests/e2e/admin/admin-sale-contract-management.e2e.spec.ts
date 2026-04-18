import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { AdminSaleContractDetailPage } from "@pages/admin/AdminSaleContractDetailPage";
import { AdminSaleContractFormPage } from "@pages/admin/AdminSaleContractFormPage";
import { AdminSaleContractListPage } from "@pages/admin/AdminSaleContractListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "../_fixtures/profileTempUsers";

type TempStaff = Awaited<ReturnType<typeof TempEntityHelper.taoStaffTam>>;
type TempCustomer = Awaited<ReturnType<typeof TempEntityHelper.taoCustomerTam>>;
type TempBuilding = Awaited<ReturnType<typeof TempEntityHelper.taoBuildingTam>>;
type TempSaleContract = Awaited<ReturnType<typeof TempEntityHelper.taoSaleContractTam>>;

test.describe("Admin Sale Contract Management E2E @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupSaleContractIds = new Set<number>();
  const cleanupCustomerIds = new Set<number>();
  const cleanupBuildingIds = new Set<number>();
  const cleanupStaffIds = new Set<number>();

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/sale-contract/list");
  });

  test.afterEach(async () => {
    for (const contractId of cleanupSaleContractIds) {
      await bootstrapAdminApi.delete(`/api/v1/admin/sale-contracts/${contractId}`, { failOnStatusCode: false });
    }
    cleanupSaleContractIds.clear();

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
    const building = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_SALE");
    cleanupBuildingIds.add(building.id);
    await TempEntityHelper.capNhatPhanCongBuilding(bootstrapAdminApi, staff.id, [building.id]);
    const customer = await TempEntityHelper.taoCustomerTam(bootstrapAdminApi, staff.id);
    cleanupCustomerIds.add(customer.id);
    await TempEntityHelper.capNhatPhanCongCustomer(bootstrapAdminApi, staff.id, [customer.id]);
    return { staff, customer, building };
  }

  test("[E2E-ADM-SCT-001] admin can search a sale contract and open detail", async ({ page }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(bootstrapAdminApi);
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

  test("[E2E-ADM-SCT-002] admin can create a sale contract from the add form", async ({ page }) => {
    const scenario = await createAssignableScenario();
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
    await formPage.expectSweetAlertContains(/thành công|thanh cong|thêm hợp đồng|them hop dong/i);

    const rows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM sale_contract
        WHERE customer_id = ? AND building_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [scenario.customer.id, scenario.building.id]
    );
    expect(rows.length).toBe(1);
    cleanupSaleContractIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-SCT-003] admin can update transfer date on the edit form", async ({ page }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(bootstrapAdminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const formPage = new AdminSaleContractFormPage(page);
    await page.goto(`/admin/sale-contract/edit/${tempSaleContract.id}`);
    await formPage.expectEditLoaded(tempSaleContract.id);
    await formPage.fillTransferDate("2026-06-16");
    await formPage.submitSaleContract();
    await formPage.expectSweetAlertContains(/thành công|thanh cong|cập nhật|cap nhat/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ transfer_date: string }>(
        "SELECT DATE_FORMAT(transfer_date, '%Y-%m-%d') AS transfer_date FROM sale_contract WHERE id = ?",
        [tempSaleContract.id]
      );
      return rows[0]?.transfer_date ?? "";
    }).toBe("2026-06-16");
  });

  test("[E2E-ADM-SCT-004] invalid transfer date before signed date is blocked on edit", async ({ page }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(bootstrapAdminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const formPage = new AdminSaleContractFormPage(page);
    await page.goto(`/admin/sale-contract/edit/${tempSaleContract.id}`);
    await formPage.expectEditLoaded(tempSaleContract.id);
    await formPage.fillTransferDate("2025-01-01");
    await formPage.submitSaleContract();
    await formPage.expectSweetAlertContains(/ngày bàn giao|ngay ban giao|không hợp lệ|khong hop le|transfer date/i);
  });

  test("[E2E-ADM-SCT-005] admin can delete a sale contract from the detail page", async ({ page }) => {
    const tempSaleContract: TempSaleContract = await TempEntityHelper.taoSaleContractTam(bootstrapAdminApi);
    cleanupSaleContractIds.add(tempSaleContract.id);
    cleanupStaffIds.add(tempSaleContract.staff.id);
    cleanupBuildingIds.add(tempSaleContract.building.id);
    cleanupCustomerIds.add(tempSaleContract.customer.id);

    const detailPage = new AdminSaleContractDetailPage(page);
    await page.goto(`/admin/sale-contract/${tempSaleContract.id}`);
    await detailPage.expectLoaded(tempSaleContract.id);
    await detailPage.deleteSaleContract();
    await detailPage.confirmSweetAlert();
    await detailPage.expectSweetAlertContains(/thành công|thanh cong|xóa hợp đồng mua bán thành công/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM sale_contract WHERE id = ?", [tempSaleContract.id]);
      return rows.length;
    }).toBe(0);

    cleanupSaleContractIds.delete(tempSaleContract.id);
  });
});
