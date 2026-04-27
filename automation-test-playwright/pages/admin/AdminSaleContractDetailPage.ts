import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminSaleContractDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/sale-contract";
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deleteButton = this.page.locator(".btn-hd-delete");
  }

  async expectLoaded(contractId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/sale-contract/${contractId}$`));
    await expect(this.firstVisible(this.page.locator(".contract-strip"))).toBeVisible();
  }

  async deleteSaleContract(): Promise<void> {
    await this.deleteButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
