import { expect, type Locator, type Page } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";

export class CustomerInvoicePage extends CustomerRoutedPage {
  protected readonly path = "/customer/invoice/list";
  readonly invoiceCards: Locator;
  readonly paymentButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.invoiceCards = this.anyLocator('[data-testid="customer-invoice-card"]', ".invoice-card");
    this.paymentButtons = this.anyLocator(
      '[data-testid="customer-pay-button"]',
      ".pay-btn",
      ".btn-payment",
      "[data-bs-target^='#paymentModal']"
    );
  }

  async openFirstPaymentModal(): Promise<void> {
    await this.paymentButtons.first().click();
  }

  async openFirstPaymentModalIfAvailable(): Promise<boolean> {
    return OptionalActionHelper.clickIfPresent(this.paymentButtons);
  }

  async confirmPaymentInModal(): Promise<void> {
    await this.page.getByRole("button", { name: /xác nhận thanh toán/i }).click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Thanh toán|invoice/i);
  }

  async assertLoaded(): Promise<void> {
    await this.expectLoaded();
  }
}
