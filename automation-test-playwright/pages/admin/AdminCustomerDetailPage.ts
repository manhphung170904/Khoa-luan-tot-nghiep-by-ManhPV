import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminCustomerDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/customer";
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deleteButton = this.page.locator(".btn-hd-delete");
  }

  async expectLoaded(customerId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/customer/${customerId}$`));
    await expect(this.page.locator(".strip-id").first()).toBeVisible();
  }

  async deleteCustomer(): Promise<void> {
    await this.deleteButton.click();
  }
}
