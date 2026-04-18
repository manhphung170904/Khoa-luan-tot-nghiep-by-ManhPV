import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class CustomerPaymentQrPage extends BasePage {
  readonly invoicePill: Locator;
  readonly amountBox: Locator;
  readonly qrImage: Locator;
  readonly metaGrid: Locator;

  constructor(page: Page) {
    super(page);
    this.invoicePill = this.page.locator(".invoice-pill");
    this.amountBox = this.page.locator(".amount-box");
    this.qrImage = this.page.locator(".qr-box img");
    this.metaGrid = this.page.locator(".meta-grid");
  }

  async expectLoaded(invoiceId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/payment-demo/qr/${invoiceId}$`));
    await expect(this.page.getByRole("heading", { name: /thanh toán bằng qr/i })).toBeVisible();
    await expect(this.invoicePill).toContainText(String(invoiceId));
    await expect(this.qrImage).toBeVisible();
  }

  async expectMetaContains(text: string | RegExp): Promise<void> {
    await expect(this.metaGrid).toContainText(text);
  }

  async confirmPayment(): Promise<void> {
    await this.page.getByRole("button", { name: /tôi đã thanh toán/i }).click();
  }

  async goBackToInvoiceList(): Promise<void> {
    await this.page.getByRole("link", { name: /quay lại danh sách hóa đơn/i }).click();
  }
}
