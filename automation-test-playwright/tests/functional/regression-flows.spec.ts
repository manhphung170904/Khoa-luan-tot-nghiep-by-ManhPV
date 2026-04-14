import { expect, test } from "@playwright/test";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import { AssertionHelper } from "@helpers/AssertionHelper";
import { PageScenarioHelper } from "@helpers/PageScenarioHelper";
import { AdminBuildingListPage } from "@pages/admin/AdminBuildingListPage";
import { AdminCustomerListPage } from "@pages/admin/AdminCustomerListPage";
import { AdminContractListPage } from "@pages/admin/AdminContractListPage";
import { AdminInvoiceListPage } from "@pages/admin/AdminInvoiceListPage";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";

test.describe("Regression Flow Suite", () => {
  test("REG-001 (Do on dinh xac thuc va dieu huong theo vai tro) @smoke @regression", async ({ page }) => {
    await AuthSessionHelper.loginAsAdminUi(page);
    await expect(page).toHaveURL(/\/admin\/dashboard|\/login-success/);
    await AuthSessionHelper.logoutUi(page);

    await AuthSessionHelper.loginAsStaffUi(page);
    await expect(page).toHaveURL(/\/staff\/dashboard|\/login-success/);
    await AuthSessionHelper.logoutUi(page);

    await AuthSessionHelper.loginAsCustomerUi(page);
    await expect(page).toHaveURL(/\/customer\/home|\/login-success/);
  });

  test("REG-003 (Do on dinh CRUD cot loi cua quan tri) @regression", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    const customerListPage = new AdminCustomerListPage(page);
    const contractListPage = new AdminContractListPage(page);
    const invoiceListPage = new AdminInvoiceListPage(page);

    await PageScenarioHelper.loginAndOpen(page, "admin", buildingListPage);
    await AssertionHelper.expectTableVisible(page, "#buildingTableBody");
    await customerListPage.open();
    await AssertionHelper.expectTableVisible(page, "#customerTableBody");
    await contractListPage.open();
    await AssertionHelper.expectTableVisible(page, "#contractTableBody");
    await invoiceListPage.open();
    await AssertionHelper.expectTableVisible(page, "#invoiceTableBody");
  });

  test("REG-006 (Do on dinh luong thanh toan) @regression", async ({ page }) => {
    const customerInvoicePage = new CustomerInvoicePage(page);
    await PageScenarioHelper.loginAndOpen(page, "customer", customerInvoicePage);
    await customerInvoicePage.expectLoaded();
    await customerInvoicePage.openFirstPaymentModalIfAvailable();
    await expect(page.locator("body")).toContainText(/thanh toán|VNPay|invoice/i);
  });
});
