import { expect, type Locator, type Page } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";

export class CustomerInvoicePage extends CustomerRoutedPage {
  protected readonly path = "/customer/invoice/list";
  readonly emptyState: Locator;
  readonly statsValues: Locator;
  readonly visibleModal: Locator;
  readonly invoiceCards: Locator;
  readonly invoiceSummaries: Locator;
  readonly paymentButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.emptyState = this.page.getByText(/Chưa có hóa đơn nào/i).first();
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
  }

  async openFirstInvoiceSummary(): Promise<void> {
    await this.invoiceSummaries.first().click();
  }

  async openFirstPaymentModal(): Promise<void> {
    await this.paymentButtons.first().click();
  }

  async openFirstPaymentModalIfAvailable(): Promise<boolean> {
    return OptionalActionHelper.clickIfPresent(this.paymentButtons);
  }

  async confirmPaymentInModal(): Promise<void> {
    await this.visibleModal.locator(".btn-payment").click();
  }

  async continueSweetAlertRedirect(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }

  async closeVisibleModal(): Promise<void> {
    await this.visibleModal.locator(".modal-header .btn-close, .modal-footer button").first().click();
  }

  async readStats(): Promise<{ unpaidCount: string; totalPayable: string }> {
    return {
      unpaidCount: (await this.statsValues.nth(0).innerText()).trim(),
      totalPayable: (await this.statsValues.nth(1).innerText()).trim()
    };
  }

  async firstInvoiceCardText(): Promise<string> {
    return (await this.invoiceCards.first().innerText()).trim();
  }

  async visibleModalText(): Promise<string> {
    return (await this.visibleModal.innerText()).trim();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toContainText(/chưa có hóa đơn nào/i);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Thanh toán|invoice/i);
    await expect(this.page.getByRole("heading", { name: /thanh toán/i })).toBeVisible();
  }

  async assertLoaded(): Promise<void> {
    await this.expectLoaded();
  }
}
