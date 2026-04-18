import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminInvoiceDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/invoice";
  readonly payButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.payButton = this.page.locator(".btn-hd-pay");
    this.deleteButton = this.page.locator(".btn-hd-delete");
  }

  async expectLoaded(invoiceId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/invoice/${invoiceId}$`));
    await expect(this.payButton.or(this.deleteButton).first()).toBeVisible();
  }

  async confirmInvoicePaid(): Promise<void> {
    await this.payButton.click();
  }

  async deleteInvoice(): Promise<void> {
    await this.deleteButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await expect(this.page.locator(".swal2-popup")).toContainText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }
}
