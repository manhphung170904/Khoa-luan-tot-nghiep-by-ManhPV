import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminStaffDetailPage } from "@pages/admin/AdminStaffDetailPage";
import { AdminStaffFormPage } from "@pages/admin/AdminStaffFormPage";
import { AdminStaffListPage } from "@pages/admin/AdminStaffListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - Staff Management @regression @e2e", () => {
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupStaffIds = new Set<number>();
  const cleanupBuildingIds = new Set<number>();
  const cleanupCustomerIds = new Set<number>();

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await new NavigationPage(page).open("/admin/staff/list");
  });

  test.afterEach(async ({ adminApi }) => {
    for (const customerId of cleanupCustomerIds) {
      await TempEntityHelper.xoaCustomerTam(adminApi, customerId);
    }
    cleanupCustomerIds.clear();

    for (const buildingId of cleanupBuildingIds) {
      await TempEntityHelper.xoaBuildingTam(adminApi, buildingId);
    }
    cleanupBuildingIds.clear();

    for (const staffId of cleanupStaffIds) {
      await adminApi.put(`/api/v1/admin/staff/${staffId}/assignments/buildings`, {
        failOnStatusCode: false,
        data: []
      });
      await adminApi.put(`/api/v1/admin/staff/${staffId}/assignments/customers`, {
        failOnStatusCode: false,
        data: []
      });
      await TempEntityHelper.xoaStaffTam(adminApi, staffId);
    }
    cleanupStaffIds.clear();

    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  test("[E2E-ADM-STF-001] - Admin Staff Management - Staff Creation - Create Staff Account from Add Form", async ({ page }) => {
    const listPage = new AdminStaffListPage(page);
    const formPage = new AdminStaffFormPage(page);
    const payload = TestDataFactory.buildAdminStaffPayload({
      username: TestDataFactory.taoUsername("e2estf")
    });

    await new NavigationPage(page).open("/admin/staff/list");
    await listPage.openAddForm();
    await formPage.expectLoaded();
    await formPage.fillStaffBasics({
      username: String(payload.username),
      password: String(payload.password),
      fullName: String(payload.fullName),
      phone: String(payload.phone),
      email: String(payload.email)
    });
    await formPage.selectRole("STAFF");
    await formPage.submit();
    await formPage.expectSweetAlertContains(/them nhan vien|thanh cong|success/i);

    const rows = await TestDbRepository.query<{ id: number; role: string }>(
      "SELECT id, role FROM staff WHERE username = ? LIMIT 1",
      [String(payload.username)]
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.role).toBe("STAFF");
    cleanupStaffIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-STF-002] - Admin Staff Management - Staff Search - Search and Detail View", async ({ page, adminApi }) => {
    const staff = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
    cleanupStaffIds.add(staff.id);

    const listPage = new AdminStaffListPage(page);
    const detailPage = new AdminStaffDetailPage(page);

    await new NavigationPage(page).open(`/admin/staff/search?role=STAFF&fullName=${encodeURIComponent(staff.fullName)}`);
    await listPage.expectLoaded();
    await listPage.waitForSearchTableData();
    await expect(listPage.rowByStaffName(staff.fullName)).toBeVisible();
    await listPage.openDetail(staff.fullName);
    await detailPage.expectLoaded(staff.id);
  });

  test("[E2E-ADM-STF-003] - Admin Staff Management - Staff Assignment - Customer and Building Assignment Update", async ({ page, adminApi }) => {
    const targetStaff = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
    cleanupStaffIds.add(targetStaff.id);
    const manager = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
    cleanupStaffIds.add(manager.id);
    const building = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_RENT");
    cleanupBuildingIds.add(building.id);
    const customer = await TempEntityHelper.taoCustomerTam(adminApi, manager.id);
    cleanupCustomerIds.add(customer.id);

    const detailPage = new AdminStaffDetailPage(page);
    await new NavigationPage(page).open(`/admin/staff/${targetStaff.id}`);
    await detailPage.expectLoaded(targetStaff.id);

    await detailPage.openBuildingAssignments();
    await detailPage.setBuildingAssignment(building.id, true);
    await detailPage.saveBuildingAssignments();
    await detailPage.expectSweetAlertContains(/cap nhat phan cong toa nha|thanh cong|success/i);

    await expect.poll(async () => {
      const response = await adminApi.get(`/api/v1/admin/staff/${targetStaff.id}/assignments/buildings`, {
        failOnStatusCode: false
      });
      const data = (await response.json()) as number[];
      return data.includes(building.id);
    }).toBe(true);

    await new NavigationPage(page).open(`/admin/staff/${targetStaff.id}`);
    await detailPage.openCustomerAssignments();
    await detailPage.setCustomerAssignment(customer.id, true);
    await detailPage.saveCustomerAssignments();
    await detailPage.expectSweetAlertContains(/cap nhat phan cong khach hang|thanh cong|success/i);

    await expect.poll(async () => {
      const response = await adminApi.get(`/api/v1/admin/staff/${targetStaff.id}/assignments/customers`, {
        failOnStatusCode: false
      });
      const data = (await response.json()) as number[];
      return data.includes(customer.id);
    }).toBe(true);
  });

  test("[E2E-ADM-STF-004] - Admin Staff Management - Staff Deletion - Search Result Deletion", async ({ page, adminApi }) => {
    const staff = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");

    const listPage = new AdminStaffListPage(page);
    await new NavigationPage(page).open(`/admin/staff/search?role=STAFF&fullName=${encodeURIComponent(staff.fullName)}`);
    await listPage.waitForSearchTableData();
    await listPage.deleteStaff(staff.fullName);
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/xoa nhan vien|thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ id: number }>("SELECT id FROM staff WHERE id = ?", [staff.id]);
      return rows.length;
    }).toBe(0);
  });
});
