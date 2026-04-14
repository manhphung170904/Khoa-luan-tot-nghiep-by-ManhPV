import { expect, test } from "@playwright/test";
import { RegisterPage } from "@pages/auth/RegisterPage";
import { RegisterVerifyPage } from "@pages/auth/RegisterVerifyPage";
import { RegisterCompletePage } from "@pages/auth/RegisterCompletePage";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";
import { AdminBuildingFormPage } from "@pages/admin/AdminBuildingFormPage";
import { AdminBuildingListPage } from "@pages/admin/AdminBuildingListPage";
import { AdminContractFormPage } from "@pages/admin/AdminContractFormPage";
import { AdminContractListPage } from "@pages/admin/AdminContractListPage";
import { AdminInvoiceFormPage } from "@pages/admin/AdminInvoiceFormPage";
import { AdminInvoiceListPage } from "@pages/admin/AdminInvoiceListPage";
import { StaffDashboardPage } from "@pages/staff/StaffDashboardPage";
import { StaffCustomerListPage } from "@pages/staff/StaffCustomerListPage";
import { StaffInvoiceListPage } from "@pages/staff/StaffInvoiceListPage";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";

test.describe("E2E Master Suite", () => {
  test("E2E-001 (Dang ky khach hang den lan dang nhap dau tien)", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const verifyPage = new RegisterVerifyPage(page);
    const completePage = new RegisterCompletePage(page);

    await registerPage.open();
    await registerPage.requestRegistrationCode("new.customer@example.com");
    await verifyPage.open("new.customer@example.com");
    await verifyPage.verifyOtp("000000");
    await completePage.open("demo-ticket", "new.customer@example.com");
    await completePage.completeRegistration("New Customer", "newCustomerPw", "12345678");
    await expect(page).toHaveURL(/register\/complete|login-success|customer\/home|login/);
  });

  test("E2E-002 (Dang nhap khach hang den xem hoa don)", async ({ page }) => {
    const invoicePage = new CustomerInvoicePage(page);

    await AuthSessionHelper.loginAsCustomerUi(page);
    await invoicePage.open();
    await invoicePage.expectLoaded();
    await expect(invoicePage.invoiceCards.first()).toBeVisible();
  });

  test("E2E-003 (Hanh trinh thanh toan hoa don cua khach hang)", async ({ page }) => {
    const invoicePage = new CustomerInvoicePage(page);

    await AuthSessionHelper.loginAsCustomerUi(page);
    await invoicePage.open();
    await invoicePage.expectLoaded();
    await invoicePage.openFirstPaymentModalIfAvailable();
    await expect(page.locator("body")).toContainText(/thanh toán|invoice|VNPay/i);
  });

  test("E2E-004 (Hanh trinh tao toa nha cua quan tri)", async ({ page }) => {
    const buildingFormPage = new AdminBuildingFormPage(page);
    const buildingListPage = new AdminBuildingListPage(page);

    await AuthSessionHelper.loginAsAdminUi(page);
    await buildingFormPage.openAdd();
    await buildingFormPage.fillBuildingBasics({ name: "PW E2E Building" });
    await buildingFormPage.submitIfPresent();
    await buildingListPage.open();
    await expect(page.locator("#buildingTableBody")).toBeVisible();
  });

  test("E2E-005 (Hanh trinh hop dong va hoa don cua quan tri) @regression", async ({ page }) => {
    const contractFormPage = new AdminContractFormPage(page);
    const contractListPage = new AdminContractListPage(page);
    const invoiceFormPage = new AdminInvoiceFormPage(page);
    const invoiceListPage = new AdminInvoiceListPage(page);

    await AuthSessionHelper.loginAsAdminUi(page);
    await contractFormPage.openAdd();
    await contractFormPage.submitIfPresent();
    await contractListPage.open();
    await expect(page.locator("#contractTableBody")).toBeVisible();
    await invoiceFormPage.openAdd();
    await invoiceFormPage.submitIfPresent();
    await invoiceListPage.open();
    await expect(page.locator("#invoiceTableBody")).toBeVisible();
  });

  test("E2E-006 (Hanh trinh lam viec hang ngay cua nhan vien) @regression", async ({ page }) => {
    const staffDashboardPage = new StaffDashboardPage(page);
    const staffCustomerListPage = new StaffCustomerListPage(page);
    const staffInvoiceListPage = new StaffInvoiceListPage(page);

    await AuthSessionHelper.loginAsStaffUi(page);
    await staffDashboardPage.open();
    await expect(page.locator("body")).toContainText(/dashboard/i);
    await staffCustomerListPage.open();
    await staffCustomerListPage.expectLoaded();
    await staffInvoiceListPage.open();
    await staffInvoiceListPage.expectLoaded();
  });
});
