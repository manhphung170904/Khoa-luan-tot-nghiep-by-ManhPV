import { expect, test, type Page } from "@playwright/test";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import { AssertionHelper } from "@helpers/AssertionHelper";
import { PageScenarioHelper } from "@helpers/PageScenarioHelper";
import { LoginPage } from "@pages/auth/LoginPage";
import { RegisterPage } from "@pages/auth/RegisterPage";
import { RegisterVerifyPage } from "@pages/auth/RegisterVerifyPage";
import { RegisterCompletePage } from "@pages/auth/RegisterCompletePage";
import { ForgotPasswordPage } from "@pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@pages/auth/ResetPasswordPage";
import { LoginSuccessPage } from "@pages/auth/LoginSuccessPage";
import { PublicLandingPage } from "@pages/public/PublicLandingPage";
import { AdminDashboardPage } from "@pages/admin/AdminDashboardPage";
import { AdminBuildingListPage } from "@pages/admin/AdminBuildingListPage";
import { AdminBuildingFormPage } from "@pages/admin/AdminBuildingFormPage";
import { AdminBuildingDetailPage } from "@pages/admin/AdminBuildingDetailPage";
import { AdminBuildingAdditionalInfoPage } from "@pages/admin/AdminBuildingAdditionalInfoPage";
import { AdminCustomerListPage } from "@pages/admin/AdminCustomerListPage";
import { AdminCustomerFormPage } from "@pages/admin/AdminCustomerFormPage";
import { AdminCustomerDetailPage } from "@pages/admin/AdminCustomerDetailPage";
import { AdminContractListPage } from "@pages/admin/AdminContractListPage";
import { AdminContractFormPage } from "@pages/admin/AdminContractFormPage";
import { AdminContractDetailPage } from "@pages/admin/AdminContractDetailPage";
import { AdminInvoiceListPage } from "@pages/admin/AdminInvoiceListPage";
import { AdminInvoiceFormPage } from "@pages/admin/AdminInvoiceFormPage";
import { AdminInvoiceDetailPage } from "@pages/admin/AdminInvoiceDetailPage";
import { AdminProfilePage } from "@pages/admin/AdminProfilePage";
import { AdminReportPage } from "@pages/admin/AdminReportPage";
import { AdminSaleContractListPage } from "@pages/admin/AdminSaleContractListPage";
import { AdminSaleContractFormPage } from "@pages/admin/AdminSaleContractFormPage";
import { AdminSaleContractDetailPage } from "@pages/admin/AdminSaleContractDetailPage";
import { AdminStaffListPage } from "@pages/admin/AdminStaffListPage";
import { AdminStaffFormPage } from "@pages/admin/AdminStaffFormPage";
import { AdminStaffDetailPage } from "@pages/admin/AdminStaffDetailPage";
import { StaffDashboardPage } from "@pages/staff/StaffDashboardPage";
import { StaffBuildingListPage } from "@pages/staff/StaffBuildingListPage";
import { StaffCustomerListPage } from "@pages/staff/StaffCustomerListPage";
import { StaffContractListPage } from "@pages/staff/StaffContractListPage";
import { StaffInvoiceListPage } from "@pages/staff/StaffInvoiceListPage";
import { StaffProfilePage } from "@pages/staff/StaffProfilePage";
import { CustomerHomePage } from "@pages/customer/CustomerHomePage";
import { CustomerBuildingListPage } from "@pages/customer/CustomerBuildingListPage";
import { CustomerContractListPage } from "@pages/customer/CustomerContractListPage";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";
import { CustomerProfilePage } from "@pages/customer/CustomerProfilePage";
import { CustomerServicePage } from "@pages/customer/CustomerServicePage";
import { CustomerTransactionHistoryPage } from "@pages/customer/CustomerTransactionHistoryPage";

const SAMPLE_EMAIL = "thesis.demo@example.com";
const SAMPLE_TICKET = "demo-ticket";
const SAMPLE_BUILDING_ID = 1;
const SAMPLE_CUSTOMER_ID = 1;
const SAMPLE_CONTRACT_ID = 1;
const SAMPLE_INVOICE_ID = 1;
const SAMPLE_SALE_CONTRACT_ID = 1;
const SAMPLE_STAFF_ID = 1;

async function expectAnyHeading(page: Page, texts: string[]) {
  await AssertionHelper.expectOneVisible(texts.map((text) => page.getByRole("heading", { name: new RegExp(text, "i") })));
}

test.describe("UI Master Suite", () => {
  test("UI-001 (Trang dang nhap hien thi) @smoke @regression", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.assertLoaded();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test("UI-002 (Kiem tra xac thuc bieu mau dang nhap)", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.submitButton.click();
    await expect(loginPage.usernameInput).toBeVisible();
    await loginPage.login("invalid-user", "invalid-password");
    await expect(page).toHaveURL(/\/login/);
  });

  test("UI-003 (Trang dang ky hien thi)", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.open();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test("UI-004 (Kiem tra email trang dang ky)", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.open();
    await registerPage.submitButton.click();
    await registerPage.emailInput.fill("invalid-email");
    await registerPage.submitButton.click();
    await registerPage.emailInput.fill(SAMPLE_EMAIL);
    await expect(registerPage.emailInput).toHaveValue(SAMPLE_EMAIL);
  });

  test("UI-005 (Trang xac minh dang ky hien thi)", async ({ page }) => {
    const verifyPage = new RegisterVerifyPage(page);
    await verifyPage.open(SAMPLE_EMAIL);
    await expect(verifyPage.otpInput).toBeVisible();
    await expect(verifyPage.verifyButton).toBeVisible();
  });

  test("UI-006 (Kiem tra OTP xac minh dang ky)", async ({ page }) => {
    const verifyPage = new RegisterVerifyPage(page);
    await verifyPage.open(SAMPLE_EMAIL);
    await verifyPage.verifyButton.click();
    await verifyPage.otpInput.fill("000000");
    await verifyPage.verifyButton.click();
    await expect(page).toHaveURL(/register\/verify|register\/complete/);
  });

  test("UI-007 (Trang hoan tat dang ky hien thi)", async ({ page }) => {
    const completePage = new RegisterCompletePage(page);
    await completePage.open(SAMPLE_TICKET, SAMPLE_EMAIL);
    await expect(completePage.fullNameInput).toBeVisible();
    await expect(completePage.usernameInput).toBeVisible();
    await expect(completePage.passwordInput).toBeVisible();
    await expect(completePage.confirmPasswordInput).toBeVisible();
  });

  test("UI-008 (Kiem tra bieu mau hoan tat dang ky)", async ({ page }) => {
    const completePage = new RegisterCompletePage(page);
    await completePage.open(SAMPLE_TICKET, SAMPLE_EMAIL);
    await completePage.completeButton.click();
    await completePage.passwordInput.fill("12345678");
    await completePage.confirmPasswordInput.fill("87654321");
    await completePage.completeButton.click();
    await expect(completePage.confirmPasswordInput).toBeVisible();
  });

  test("UI-009 (Trang dang nhap thanh cong hien thi)", async ({ page }) => {
    const loginSuccessPage = new LoginSuccessPage(page);
    await loginSuccessPage.open("/customer/home");
    await expect(page).toHaveURL(/login-success|customer\/home|login/);
  });

  test("UI-010 (Trang quen mat khau hien thi)", async ({ page }) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.open();
    await expect(forgotPasswordPage.emailInput).toBeVisible();
    await expect(forgotPasswordPage.submitButton).toBeVisible();
  });

  test("UI-011 (Kiem tra email quen mat khau)", async ({ page }) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.open();
    await forgotPasswordPage.submitButton.click();
    await forgotPasswordPage.emailInput.fill("invalid-email");
    await forgotPasswordPage.submitButton.click();
    await forgotPasswordPage.emailInput.fill(SAMPLE_EMAIL);
    await expect(forgotPasswordPage.emailInput).toHaveValue(SAMPLE_EMAIL);
  });

  test("UI-012 (Trang dat lai mat khau hien thi)", async ({ page }) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.open(SAMPLE_EMAIL);
    await expect(resetPasswordPage.otpInput).toBeVisible();
    await expect(resetPasswordPage.newPasswordInput).toBeVisible();
    await expect(resetPasswordPage.confirmPasswordInput).toBeVisible();
  });

  test("UI-013 (Kiem tra dat lai mat khau)", async ({ page }) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.open(SAMPLE_EMAIL);
    await resetPasswordPage.submitButton.click();
    await resetPasswordPage.otpInput.fill("000000");
    await resetPasswordPage.newPasswordInput.fill("12345678");
    await resetPasswordPage.confirmPasswordInput.fill("87654321");
    await resetPasswordPage.submitButton.click();
    await expect(resetPasswordPage.confirmPasswordInput).toBeVisible();
  });

  test("UI-014 (Trang cong khai hien thi)", async ({ page }) => {
    const publicPage = new PublicLandingPage(page);
    await publicPage.open();
    await publicPage.expectResultsLoaded();
    await expect(publicPage.filterForm).toBeVisible();
  });

  test("UI-015 (Dieu khien tim kiem trang cong khai)", async ({ page }) => {
    const publicPage = new PublicLandingPage(page);
    await publicPage.open();
    await publicPage.searchByBuildingName("tower");
    await publicPage.selectDistrictIfAvailable("1");
    await publicPage.searchButton.click();
    await publicPage.resetFiltersIfAvailable();
    await publicPage.expectResultsLoaded();
  });

  test("UI-016 (Trang dashboard quan tri hien thi) @smoke @regression", async ({ page }) => {
    const adminDashboardPage = new AdminDashboardPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", adminDashboardPage);
    await adminDashboardPage.expectLoaded();
    await expect(page.locator(".stat-card")).toHaveCount(4);
  });

  test("UI-017 (Trang danh sach toa nha quan tri)", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    await PageScenarioHelper.loginAndExpectTable(page, "admin", buildingListPage, "#buildingTableBody");
  });

  test("UI-018 (Trang tim kiem toa nha quan tri)", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", buildingListPage);
    await buildingListPage.filterByName("tower");
    await buildingListPage.search();
    await AssertionHelper.expectTableVisible(page, "#buildingTableBody");
  });

  test("UI-019 (Trang them toa nha quan tri)", async ({ page }) => {
    const buildingFormPage = new AdminBuildingFormPage(page);
    await PageScenarioHelper.loginAs(page, "admin");
    await buildingFormPage.openAdd();
    await expect(page).toHaveTitle(/Thêm bất động sản/i);
  });

  test("UI-020 (Trang sua toa nha quan tri)", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", buildingListPage);
    await buildingListPage.clickFirstEditButton();
    await expect(page).toHaveTitle(/Sửa bất động sản/i);
  });

  test("UI-021 (Trang chi tiet toa nha quan tri)", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", buildingListPage);
    await buildingListPage.clickFirstViewButton();
    await expect(page).toHaveTitle(/Chi tiết Bất động sản|Building/i);
  });

  test("UI-022 (Trang thong tin bo sung toa nha quan tri)", async ({ page }) => {
    const buildingListPage = new AdminBuildingListPage(page);
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", buildingListPage);
    const href = await buildingListPage.firstViewButton().getAttribute("href");
    const buildingId = Number(href?.split("/").pop());
    await additionalInfoPage.open(buildingId);
    await expect(page).toHaveTitle(/Thông tin bổ sung/i);
  });

  test("UI-023 (Trang danh sach khach hang quan tri)", async ({ page }) => {
    const customerListPage = new AdminCustomerListPage(page);
    await PageScenarioHelper.loginAndExpectTable(page, "admin", customerListPage);
  });

  test("UI-024 (Trang tim kiem khach hang quan tri)", async ({ page }) => {
    const customerListPage = new AdminCustomerListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", customerListPage);
    await customerListPage.fillFilterIfPresent("fullName", "a");
    await customerListPage.searchIfAvailable();
    await AssertionHelper.expectTableVisible(page);
  });

  test("UI-025 (Trang them khach hang quan tri)", async ({ page }) => {
    const customerFormPage = new AdminCustomerFormPage(page);
    await PageScenarioHelper.loginAs(page, "admin");
    await customerFormPage.openAdd();
    await expect(page).toHaveTitle(/Thêm Khách hàng/i);
  });

  test("UI-026 (Trang chi tiet khach hang quan tri)", async ({ page }) => {
    const customerListPage = new AdminCustomerListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", customerListPage);
    await customerListPage.clickFirstViewButton();
    await expect(page).toHaveTitle(/Chi tiết Khách hàng|customer/i);
  });

  test("UI-027 (Trang danh sach hop dong quan tri)", async ({ page }) => {
    const contractListPage = new AdminContractListPage(page);
    await AuthSessionHelper.loginAsAdminUi(page);
    await contractListPage.open();
    await expect(page.locator("tbody")).toBeVisible();
  });

  test("UI-028 (Trang tim kiem hop dong quan tri)", async ({ page }) => {
    const contractListPage = new AdminContractListPage(page);
    await AuthSessionHelper.loginAsAdminUi(page);
    await contractListPage.open();
    await contractListPage.fillFilterIfPresent("customerName", "a");
    await contractListPage.searchIfAvailable();
    await expect(page.locator("tbody")).toBeVisible();
  });

  test("UI-029 (Trang them hop dong quan tri)", async ({ page }) => {
    const contractFormPage = new AdminContractFormPage(page);
    await PageScenarioHelper.loginAs(page, "admin");
    await contractFormPage.openAdd();
    await expect(page).toHaveTitle(/Thêm Hợp đồng/i);
  });

  test("UI-030 (Trang sua hop dong quan tri)", async ({ page }) => {
    const contractListPage = new AdminContractListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", contractListPage);
    await contractListPage.clickFirstEditButton();
    await expect(page).toHaveTitle(/Sửa Hợp Đồng/i);
  });

  test("UI-031 (Trang chi tiet hop dong quan tri)", async ({ page }) => {
    const contractListPage = new AdminContractListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", contractListPage);
    await contractListPage.clickFirstViewButton();
    await expect(page).toHaveTitle(/Chi tiết Hợp đồng|contract/i);
  });

  test("UI-032 (Trang danh sach hoa don quan tri)", async ({ page }) => {
    const invoiceListPage = new AdminInvoiceListPage(page);
    await AuthSessionHelper.loginAsAdminUi(page);
    await invoiceListPage.open();
    await expect(page.locator("tbody")).toBeVisible();
  });

  test("UI-033 (Trang tim kiem hoa don quan tri)", async ({ page }) => {
    const invoiceListPage = new AdminInvoiceListPage(page);
    await AuthSessionHelper.loginAsAdminUi(page);
    await invoiceListPage.open();
    await invoiceListPage.fillFilterIfPresent("customerName", "a");
    await invoiceListPage.searchIfAvailable();
    await expect(page.locator("tbody")).toBeVisible();
  });

  test("UI-034 (Trang them hoa don quan tri)", async ({ page }) => {
    const invoiceFormPage = new AdminInvoiceFormPage(page);
    await PageScenarioHelper.loginAs(page, "admin");
    await invoiceFormPage.openAdd();
    await expect(page).toHaveTitle(/Thêm Hóa Đơn/i);
  });

  test("UI-035 (Trang sua hoa don quan tri)", async ({ page }) => {
    const invoiceListPage = new AdminInvoiceListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", invoiceListPage);
    await invoiceListPage.clickFirstEditButton();
    await expect(page).toHaveTitle(/Sửa Hóa Đơn/i);
  });

  test("UI-036 (Trang chi tiet hoa don quan tri)", async ({ page }) => {
    const invoiceListPage = new AdminInvoiceListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", invoiceListPage);
    await invoiceListPage.clickFirstViewButton();
    await expect(page).toHaveTitle(/Chi tiết Hóa đơn|invoice/i);
  });

  test("UI-037 (Trang ho so quan tri)", async ({ page }) => {
    const adminProfilePage = new AdminProfilePage(page);
    await AuthSessionHelper.loginAsAdminUi(page);
    await adminProfilePage.open();
    await adminProfilePage.expectLoaded();
  });

  test("UI-038 (Trang bao cao quan tri)", async ({ page }) => {
    const adminReportPage = new AdminReportPage(page);
    await AuthSessionHelper.loginAsAdminUi(page);
    await adminReportPage.open();
    await expect(page.locator("canvas, select").first()).toBeVisible();
  });

  test("UI-039 (Trang danh sach hop dong mua ban quan tri)", async ({ page }) => {
    const saleContractListPage = new AdminSaleContractListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", saleContractListPage);
    await saleContractListPage.expectLoaded();
  });

  test("UI-040 (Trang tim kiem hop dong mua ban quan tri)", async ({ page }) => {
    const saleContractListPage = new AdminSaleContractListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", saleContractListPage);
    await saleContractListPage.fillFilterIfPresent("customerName", "a");
    await saleContractListPage.searchIfAvailable();
    await saleContractListPage.expectLoaded();
  });
  test("UI-041 (Trang them hop dong mua ban quan tri)", async ({ page }) => {
    const saleContractFormPage = new AdminSaleContractFormPage(page);
    await PageScenarioHelper.loginAs(page, "admin");
    await saleContractFormPage.openAdd();
    await expect(page).toHaveTitle(/Thêm Hợp đồng mua bán/i);
  });

  test("UI-042 (Trang sua hop dong mua ban quan tri)", async ({ page }) => {
    const saleContractListPage = new AdminSaleContractListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", saleContractListPage);
    await saleContractListPage.clickFirstEditButton();
    await expect(page).toHaveTitle(/Cập nhật ngày bàn giao|Sửa|Hợp đồng mua bán/i);
  });

  test("UI-043 (Trang chi tiet hop dong mua ban quan tri)", async ({ page }) => {
    const saleContractListPage = new AdminSaleContractListPage(page);
    const saleContractDetailPage = new AdminSaleContractDetailPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", saleContractListPage);
    await saleContractListPage.openFirstDetail();
    await saleContractDetailPage.expectLoaded();
  });

  test("UI-044 (Trang danh sach nhan vien quan tri)", async ({ page }) => {
    const staffListPage = new AdminStaffListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", staffListPage);
    await staffListPage.expectLoaded();
  });

  test("UI-045 (Trang tim kiem nhan vien quan tri)", async ({ page }) => {
    const staffListPage = new AdminStaffListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", staffListPage);
    await staffListPage.fillFilterIfPresent("fullName", "a");
    await staffListPage.searchIfAvailable();
    await staffListPage.expectLoaded();
  });
  test("UI-046 (Trang them nhan vien quan tri)", async ({ page }) => {
    const staffFormPage = new AdminStaffFormPage(page);
    await PageScenarioHelper.loginAs(page, "admin");
    await staffFormPage.openAdd();
    await expect(page).toHaveTitle(/Thêm Nhân viên/i);
  });

  test("UI-047 (Trang chi tiet nhan vien quan tri)", async ({ page }) => {
    const staffListPage = new AdminStaffListPage(page);
    const staffDetailPage = new AdminStaffDetailPage(page);
    await PageScenarioHelper.loginAndOpen(page, "admin", staffListPage);
    await staffListPage.openFirstDetail();
    await staffDetailPage.expectLoaded();
  });

  test("UI-048 (Trang dashboard nhan vien)", async ({ page }) => {
    const staffDashboardPage = new StaffDashboardPage(page);
    await AuthSessionHelper.loginAsStaffUi(page);
    await staffDashboardPage.open();
    await expect(page.locator("body")).toContainText(/dashboard|há»£p Ä‘á»“ng|invoice/i);
  });

  test("UI-049 (Trang danh sach toa nha nhan vien)", async ({ page }) => {
    const staffBuildingListPage = new StaffBuildingListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "staff", staffBuildingListPage);
    await staffBuildingListPage.expectLoaded();
  });

  test("UI-050 (Trang danh sach khach hang nhan vien)", async ({ page }) => {
    const staffCustomerListPage = new StaffCustomerListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "staff", staffCustomerListPage);
    await staffCustomerListPage.expectLoaded();
  });

  test("UI-051 (Trang danh sach hop dong nhan vien)", async ({ page }) => {
    const staffContractListPage = new StaffContractListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "staff", staffContractListPage);
    await staffContractListPage.expectLoaded();
  });

  test("UI-052 (Trang danh sach hoa don nhan vien)", async ({ page }) => {
    const staffInvoiceListPage = new StaffInvoiceListPage(page);
    await PageScenarioHelper.loginAndOpen(page, "staff", staffInvoiceListPage);
    await staffInvoiceListPage.expectLoaded();
  });
  test("UI-053 (Trang ho so nhan vien)", async ({ page }) => {
    const staffProfilePage = new StaffProfilePage(page);
    await AuthSessionHelper.loginAsStaffUi(page);
    await staffProfilePage.open();
    await staffProfilePage.expectLoaded();
  });

  test("UI-054 (Trang trang chu khach hang)", async ({ page }) => {
    const customerHomePage = new CustomerHomePage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerHomePage.open();
    await customerHomePage.expectLoaded();
  });

  test("UI-055 (Trang danh sach toa nha khach hang)", async ({ page }) => {
    const customerBuildingListPage = new CustomerBuildingListPage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerBuildingListPage.open();
    await expect(page.locator("body")).toContainText(/tÃ²a nhÃ |building/i);
  });

  test("UI-056 (Trang danh sach hop dong khach hang)", async ({ page }) => {
    const customerContractListPage = new CustomerContractListPage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerContractListPage.open();
    await customerContractListPage.expectLoaded();
  });

  test("UI-057 (Trang hoa don khach hang) @smoke @regression", async ({ page }) => {
    const customerInvoicePage = new CustomerInvoicePage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerInvoicePage.open();
    await customerInvoicePage.expectLoaded();
    await expect(page.locator("body")).toContainText(/TỔNG CỘNG|Thanh toán|invoice/i);
  });

  test("UI-058 (Trang ho so khach hang)", async ({ page }) => {
    const customerProfilePage = new CustomerProfilePage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerProfilePage.open();
    await customerProfilePage.expectLoaded();
  });

  test("UI-059 (Trang dich vu khach hang)", async ({ page }) => {
    const customerServicePage = new CustomerServicePage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerServicePage.open();
    await customerServicePage.expectLoaded();
  });

  test("UI-060 (Trang lich su giao dich khach hang)", async ({ page }) => {
    const customerTransactionHistoryPage = new CustomerTransactionHistoryPage(page);
    await AuthSessionHelper.loginAsCustomerUi(page);
    await customerTransactionHistoryPage.open();
    await customerTransactionHistoryPage.expectLoaded();
  });
});

