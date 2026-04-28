import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { StaffCustomerListPage } from "@pages/staff/StaffCustomerListPage";
import { loginAsTempUser } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

test.describe("Staff - Customer List @regression @e2e", () => {
  let tempContract: TempContract | null = null;

  test.beforeEach(async ({ page, adminApi }) => {
    tempContract = await TempEntityHelper.taoContractTam(adminApi);
    await loginAsTempUser(page, tempContract.staff.username);
    await new NavigationPage(page).open("/staff/customers");
  });

  test.afterEach(async ({ adminApi }) => {
    await TempEntityHelper.xoaContractTam(adminApi, tempContract ?? undefined);
    tempContract = null;
  });

  test("[E2E-STF-CUS-001] - Staff Customer List - Assigned Customers - Assigned Customer Display", async ({ page }) => {
    const customerPage = new StaffCustomerListPage(page);
    await customerPage.expectLoaded();
    await customerPage.waitForTableData();
    await expect(customerPage.rowByCustomerName(tempContract!.customer.fullName)).toBeVisible();

    const rows = await TestDbRepository.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM contract WHERE id = ? AND staff_id = ? AND customer_id = ?",
      [tempContract!.id, tempContract!.staff.id, tempContract!.customer.id]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-STF-CUS-002] - Staff Customer List - Customer Search - Search and Details Modal", async ({ page }) => {
    const customerPage = new StaffCustomerListPage(page);
    await customerPage.expectLoaded();
    await customerPage.filterByFullName(tempContract!.customer.fullName);
    await customerPage.submitFilters();
    await customerPage.waitForTableData();
    await customerPage.openCustomerDetail(tempContract!.customer.fullName);
    await customerPage.expectDetailModalContains(tempContract!.customer.fullName);
  });
});
