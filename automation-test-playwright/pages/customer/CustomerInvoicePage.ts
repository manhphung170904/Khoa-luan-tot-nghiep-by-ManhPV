import { expect, type Locator, type Page } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";
import { SweetAlertComponent } from "../components/SweetAlertComponent";

export class CustomerInvoicePage extends CustomerRoutedPage {
  protected readonly path = "/customer/invoice/list";
  readonly emptyState: Locator;
  readonly statsValues: Locator;
  readonly visibleModal: Locator;
  readonly invoiceCards: Locator;
  readonly invoiceSummaries: Locator;
  readonly paymentButtons: Locator;
  private readonly sweetAlert: SweetAlertComponent;

  constructor(page: Page) {
    super(page);
    this.emptyState = this.firstVisible(this.page.getByText(/chưa có hóa đơn nào|chua co hoa don nao/i));
    this.statsValues = this.page.locator(".stat-value");
    this.visibleModal = this.page.locator(".modal.show");
    this.invoiceCards = this.anyLocator('[data-testid="customer-invoice-card"]', ".invoice-card");
    this.invoiceSummaries = this.page.locator(".invoice-summary");
    this.paymentButtons = this.anyLocator(
      '[data-testid="customer-pay-button"]',
      ".pay-btn",
      ".btn-payment",
      "[data-bs-target^='#paymentModal']"
    );
    this.sweetAlert = new SweetAlertComponent(page);
  }

  async openFirstInvoiceSummary(): Promise<void> {
    await this.firstVisible(this.invoiceSummaries).click();
  }

  async openFirstPaymentModal(): Promise<void> {
    await this.firstVisible(this.paymentButtons).click();
  }

  async openFirstPaymentModalIfAvailable(): Promise<boolean> {
    return OptionalActionHelper.clickIfPresent(this.paymentButtons);
  }

  async confirmPaymentInModal(): Promise<void> {
    await this.visibleModal.locator(".btn-payment").click();
  }

  async continueSweetAlertRedirect(): Promise<void> {
    await this.sweetAlert.confirm();
  }

  async closeVisibleModal(): Promise<void> {
    await this.firstVisible(this.visibleModal.locator(".modal-header .btn-close, .modal-footer button")).click();
  }

  async readStats(): Promise<{ unpaidCount: string; totalPayable: string }> {
    return {
      unpaidCount: (await this.statsValues.nth(0).innerText()).trim(),
      totalPayable: (await this.statsValues.nth(1).innerText()).trim()
    };
  }

  async firstInvoiceCardText(): Promise<string> {
    return (await this.firstVisible(this.invoiceCards).innerText()).trim();
  }

  async visibleModalText(): Promise<string> {
    return (await this.visibleModal.innerText()).trim();
  }

  async visibleModalLooseText(): Promise<string> {
    return this.locatorLooseText(this.visibleModal);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toContainText(/chưa có hóa đơn nào|chua co hoa don nao/i);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Thanh toán|Thanh toan|invoice/i);
    await expect(this.page.getByRole("heading", { name: /thanh toán|thanh toan/i })).toBeVisible();
  }

  async assertLoaded(): Promise<void> {
    await this.expectLoaded();
  }

  async expectPaymentSuccessAlert(): Promise<void> {
    await this.sweetAlert.expectContains(/thanh toán thành công|thanh toan thanh cong|payment success|paysuccess/i);
  }
}
