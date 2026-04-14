import { expect, test } from "@playwright/test";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import { AssertionHelper } from "@helpers/AssertionHelper";
import { PageScenarioHelper } from "@helpers/PageScenarioHelper";
import { PublicLandingPage } from "@pages/public/PublicLandingPage";
import { AdminBuildingListPage } from "@pages/admin/AdminBuildingListPage";
import { AdminBuildingFormPage } from "@pages/admin/AdminBuildingFormPage";
import { AdminContractListPage } from "@pages/admin/AdminContractListPage";
import { AdminContractFormPage } from "@pages/admin/AdminContractFormPage";
import { AdminInvoiceListPage } from "@pages/admin/AdminInvoiceListPage";
import { AdminInvoiceFormPage } from "@pages/admin/AdminInvoiceFormPage";
import { CustomerHomePage } from "@pages/customer/CustomerHomePage";
import { CustomerContractListPage } from "@pages/customer/CustomerContractListPage";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";
import { CustomerProfilePage } from "@pages/customer/CustomerProfilePage";
import { CustomerTransactionHistoryPage } from "@pages/customer/CustomerTransactionHistoryPage";
import { StaffBuildingListPage } from "@pages/staff/StaffBuildingListPage";
import { StaffCustomerListPage } from "@pages/staff/StaffCustomerListPage";
import { StaffInvoiceListPage } from "@pages/staff/StaffInvoiceListPage";

test.describe("Functional Master Suite", () => {
  test("FUN-001 (Dang nhap va dang xuat theo vai tro)", async ({ page }) => {
    await AuthSessionHelper.loginAsAdminUi(page);
    await expect(page).toHaveURL(/\/admin\/dashboard|\/login-success/);
    await AuthSessionHelper.logoutUi(page);
    await expect(page).toHaveURL(/\/login/);

    await AuthSessionHelper.loginAsStaffUi(page);
    await expect(page).toHaveURL(/\/staff\/dashboard|\/login-success/);
    await AuthSessionHelper.logoutUi(page);
    await expect(page).toHaveURL(/\/login/);

    await AuthSessionHelper.loginAsCustomerUi(page);
    await expect(page).toHaveURL(/\/customer\/home|\/login-success/);
    await AuthSessionHelper.logoutUi(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test("FUN-002 (Tim kiem va loc toa nha cong khai) @smoke @regression", async ({ page }) => {
    const publicPage = new PublicLandingPage(page);
    await publicPage.open();
    await publicPage.searchByBuildingName("tower");
    await publicPage.selectDistrictIfAvailable("1");
    await publicPage.searchButton.click();
    await publicPage.expectResultsLoaded();
  });

  test("FUN-003 (Vong doi quan ly toa nha cua quan tri)", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    const buildingFormPage = new AdminBuildingFormPage(page);

    await PageScenarioHelper.loginAndExpectForm(page, "admin", () => buildingFormPage.openAdd());
    await buildingFormPage.fillBuildingBasics({ name: "PW Lifecycle Building" });
    await buildingFormPage.submitIfPresent();
    await buildingListPage.open();
    await AssertionHelper.expectTableVisible(page, "#buildingTableBody");
  });

  test("FUN-004 (Vong doi quan ly hop dong cua quan tri)", async ({ page }) => {
    const contractListPage = new AdminContractListPage(page);
    const contractFormPage = new AdminContractFormPage(page);

    await PageScenarioHelper.loginAndExpectForm(page, "admin", () => contractFormPage.openAdd());
    await contractFormPage.submitIfPresent();
    await contractListPage.open();
    await AssertionHelper.expectTableVisible(page, "#contractTableBody");
  });

  test("FUN-005 (Xu ly hoa don cua quan tri)", async ({ page }) => {
    const invoiceListPage = new AdminInvoiceListPage(page);
    const invoiceFormPage = new AdminInvoiceFormPage(page);

    await PageScenarioHelper.loginAndExpectForm(page, "admin", () => invoiceFormPage.openAdd());
    await invoiceFormPage.submitIfPresent();
    await invoiceListPage.open();
    await AssertionHelper.expectTableVisible(page, "#invoiceTableBody");
  });

  test("FUN-006 (Phan cong va quyen thao tac cua nhan vien) @regression", async ({ page }) => {
    const staffBuildingListPage = new StaffBuildingListPage(page);
    const staffCustomerListPage = new StaffCustomerListPage(page);
    const staffInvoiceListPage = new StaffInvoiceListPage(page);

    await PageScenarioHelper.loginAs(page, "staff");
    await staffBuildingListPage.open();
    await staffBuildingListPage.expectLoaded();
    await staffCustomerListPage.open();
    await staffCustomerListPage.expectLoaded();
    await staffInvoiceListPage.open();
    await staffInvoiceListPage.expectLoaded();
  });

  test("FUN-007 (Luong tu phuc vu cua khach hang) @regression", async ({ page }) => {
    const customerHomePage = new CustomerHomePage(page);
    const customerContractListPage = new CustomerContractListPage(page);
    const customerInvoicePage = new CustomerInvoicePage(page);
    const customerTransactionHistoryPage = new CustomerTransactionHistoryPage(page);
    const customerProfilePage = new CustomerProfilePage(page);

    await PageScenarioHelper.loginAs(page, "customer");
    await customerHomePage.open();
    await expect(page.locator("body")).toContainText(/trang chủ|home/i);
    await customerContractListPage.open();
    await expect(page.locator("body")).toContainText(/contract|hợp đồng/i);
    await customerInvoicePage.open();
    await customerInvoicePage.expectLoaded();
    await customerTransactionHistoryPage.open();
    await expect(page.locator("body")).toContainText(/transaction|giao dịch/i);
    await customerProfilePage.open();
    await expect(page.locator("body")).toContainText(/tài khoản|thông tin/i);
  });
});
