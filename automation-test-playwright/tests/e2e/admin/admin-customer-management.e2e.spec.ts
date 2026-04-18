import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminCustomerDetailPage } from "@pages/admin/AdminCustomerDetailPage";
import { AdminCustomerFormPage } from "@pages/admin/AdminCustomerFormPage";
import { AdminCustomerListPage } from "@pages/admin/AdminCustomerListPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "../_fixtures/profileTempUsers";

test.describe("Admin Customer Management E2E @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  const cleanupStaffIds = new Set<number>();
  const cleanupCustomerIds = new Set<number>();

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/customer/list");
  });

  test.afterEach(async () => {
    for (const customerId of cleanupCustomerIds) {
      await TempEntityHelper.xoaCustomerTam(bootstrapAdminApi, customerId);
    }
    cleanupCustomerIds.clear();

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

  test("[E2E-ADM-CUS-001] admin can create a customer from the add form", async ({ page }) => {
    const manager = await TempEntityHelper.taoStaffTam(bootstrapAdminApi, "STAFF");
    cleanupStaffIds.add(manager.id);

    const listPage = new AdminCustomerListPage(page);
    const formPage = new AdminCustomerFormPage(page);
    const payload = TestDataFactory.buildCustomerPayload({
      username: `e2ecust${String(Date.now()).slice(-7)}`
    });

    await page.goto("/admin/customer/list");
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
    await formPage.expectSweetAlertContains(/thêm khách hàng|thành công/i);

    const rows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM customer WHERE username = ? LIMIT 1",
      [String(payload.username)]
    );
    expect(rows.length).toBe(1);
    cleanupCustomerIds.add(rows[0]!.id);
  });

  test("[E2E-ADM-CUS-002] admin can search a customer and open its detail page", async ({ page }) => {
    const manager = await TempEntityHelper.taoStaffTam(bootstrapAdminApi, "STAFF");
    cleanupStaffIds.add(manager.id);
    const customer = await TempEntityHelper.taoCustomerTam(bootstrapAdminApi, manager.id);
    cleanupCustomerIds.add(customer.id);

    const listPage = new AdminCustomerListPage(page);
    const detailPage = new AdminCustomerDetailPage(page);

    await page.goto(`/admin/customer/search?fullName=${encodeURIComponent(customer.fullName)}`);
    await listPage.expectLoaded();
    await listPage.waitForTableData();
    await expect(listPage.rowByCustomerName(customer.fullName)).toBeVisible();
    await listPage.openDetail(customer.fullName);
    await detailPage.expectLoaded(customer.id);
  });

  test("[E2E-ADM-CUS-003] customer add validation shows an error when no staff is selected", async ({ page }) => {
    const formPage = new AdminCustomerFormPage(page);
    const payload = TestDataFactory.buildCustomerPayload({
      username: `nostaff${String(Date.now()).slice(-6)}`
    });

    await page.goto("/admin/customer/add");
    await formPage.expectLoaded();
    await formPage.fillCustomerBasics({
      username: String(payload.username),
      password: String(payload.password),
      fullName: String(payload.fullName),
      phone: String(payload.phone),
      email: String(payload.email)
    });
    await formPage.submit();
    await formPage.expectSweetAlertContains(/lỗi|error|nhân viên/i);
  });

  test("[E2E-ADM-CUS-004] admin can delete a customer from the search page", async ({ page }) => {
    const manager = await TempEntityHelper.taoStaffTam(bootstrapAdminApi, "STAFF");
    cleanupStaffIds.add(manager.id);
    const customer = await TempEntityHelper.taoCustomerTam(bootstrapAdminApi, manager.id);

    const listPage = new AdminCustomerListPage(page);
    await page.goto(`/admin/customer/search?fullName=${encodeURIComponent(customer.fullName)}`);
    await listPage.waitForTableData();
    await listPage.deleteCustomer(customer.fullName);
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/xóa khách hàng|thành công/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM customer WHERE id = ?", [customer.id]);
      return rows.length;
    }).toBe(0);
  });
});
