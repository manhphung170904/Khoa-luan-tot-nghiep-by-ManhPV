import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminCustomerDetailPage } from "@pages/admin/AdminCustomerDetailPage";
import { AdminCustomerFormPage } from "@pages/admin/AdminCustomerFormPage";
import { AdminCustomerListPage } from "@pages/admin/AdminCustomerListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

test.describe("Admin - Customer Management @regression @e2e", () => {
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupStaffIds = new Set<number>();
  const cleanupCustomerIds = new Set<number>();

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await new NavigationPage(page).open("/admin/customer/list");
  });

  test.afterEach(async ({ adminApi }) => {
    for (const customerId of cleanupCustomerIds) {
      await TempEntityHelper.xoaCustomerTam(adminApi, customerId);
    }
    cleanupCustomerIds.clear();

    for (const staffId of cleanupStaffIds) {
      await TempEntityHelper.xoaStaffTam(adminApi, staffId);
    }
    cleanupStaffIds.clear();

    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  test("[E2E-ADM-CUS-001] - Admin Customer Management - Customer Creation - Create Customer from Add Form", async ({ page, adminApi }) => {
    const manager = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
    cleanupStaffIds.add(manager.id);

    const listPage = new AdminCustomerListPage(page);
    const formPage = new AdminCustomerFormPage(page);
    const payload = TestDataFactory.buildCustomerPayload({
      username: TestDataFactory.taoUsername("e2ecust")
    });

    await new NavigationPage(page).open("/admin/customer/list");
    await listPage.openAddForm();
    await formPage.expectLoaded();
    await formPage.fillCustomerBasics({
      username: String(payload.username),
      password: String(payload.password),
      fullName: String(payload.fullName),
      phone: String(payload.phone),
      email: String(payload.email)
    });
    await formPage.selectStaffIds([manager.id]);
    await formPage.submit();
    await formPage.expectSweetAlertContains(/them khach hang|thm khch hng|thnh cng|thanh cong|success/i);

    const rows = await TestDbRepository.query<{ id: number }>(
      "SELECT id FROM customer WHERE username = ? LIMIT 1",
      [String(payload.username)]
    );
    expect(rows.length).toBe(1);
    cleanupCustomerIds.add(rows[0]!.id);

    const assignments = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM assignment_customer WHERE staff_id = ? AND customer_id = ?",
      [manager.id, rows[0]!.id]
    );
    expect(Number(assignments[0]?.count ?? 0)).toBeGreaterThan(0);
  });

  test("[E2E-ADM-CUS-002] - Admin Customer Management - Customer Search - Search and Detail View", async ({ page, adminApi }) => {
    const manager = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
    cleanupStaffIds.add(manager.id);
    const customer = await TempEntityHelper.taoCustomerTam(adminApi, manager.id);
    cleanupCustomerIds.add(customer.id);

    const listPage = new AdminCustomerListPage(page);
    const detailPage = new AdminCustomerDetailPage(page);

    await new NavigationPage(page).open(`/admin/customer/search?fullName=${encodeURIComponent(customer.fullName)}`);
    await listPage.expectLoaded();
    await listPage.waitForTableData();
    await expect(listPage.rowByCustomerName(customer.fullName)).toBeVisible();
    await listPage.openDetail(customer.fullName);
    await detailPage.expectLoaded(customer.id);
  });

  test("[E2E-ADM-CUS-003] - Admin Customer Management - Staff Assignment - No Staff Selected Validation", async ({ page }) => {
    const formPage = new AdminCustomerFormPage(page);
    const payload = TestDataFactory.buildCustomerPayload({
      username: TestDataFactory.taoUsername("nostaff")
    });

    await new NavigationPage(page).open("/admin/customer/add");
    await formPage.expectLoaded();
    await formPage.fillCustomerBasics({
      username: String(payload.username),
      password: String(payload.password),
      fullName: String(payload.fullName),
      phone: String(payload.phone),
      email: String(payload.email)
    });
    await formPage.submit();
    await formPage.expectSweetAlertContains(/l?i|loi|error|nhn vin|nhan vien/i);

    const rows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM customer WHERE username = ? OR email = ?",
      [String(payload.username), String(payload.email)]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[E2E-ADM-CUS-004] - Admin Customer Management - Customer Deletion - Search Result Deletion", async ({ page, adminApi }) => {
    const manager = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
    cleanupStaffIds.add(manager.id);
    const customer = await TempEntityHelper.taoCustomerTam(adminApi, manager.id);

    const listPage = new AdminCustomerListPage(page);
    await new NavigationPage(page).open(`/admin/customer/search?fullName=${encodeURIComponent(customer.fullName)}`);
    await listPage.waitForTableData();
    await listPage.deleteCustomer(customer.fullName);
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/xoa khach hang|xa khch hng|thnh cng|thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ id: number }>("SELECT id FROM customer WHERE id = ?", [customer.id]);
      return rows.length;
    }).toBe(0);
  });
});
