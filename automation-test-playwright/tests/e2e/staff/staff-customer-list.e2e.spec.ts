import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { StaffCustomerListPage } from "@pages/staff/StaffCustomerListPage";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Staff Customer List E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempContract: TempContract | null = null;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.staff.username);
    await page.goto("/staff/customers");
  });

  test.afterEach(async () => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-STF-CUS-001] staff sees assigned customers", async ({ page }) => {
    const customerPage = new StaffCustomerListPage(page);
    await customerPage.expectLoaded();
    await customerPage.waitForTableData();
    await expect(customerPage.rowByCustomerName(tempContract!.customer.fullName)).toBeVisible();
  });

  test("[E2E-STF-CUS-002] staff can search customer and open detail modal", async ({ page }) => {
    const customerPage = new StaffCustomerListPage(page);
    await customerPage.expectLoaded();
    await customerPage.filterByFullName(tempContract!.customer.fullName);
    await customerPage.submitFilters();
    await customerPage.waitForTableData();
    await customerPage.openCustomerDetail(tempContract!.customer.fullName);
    await customerPage.expectDetailModalContains(tempContract!.customer.fullName);
  });
});
