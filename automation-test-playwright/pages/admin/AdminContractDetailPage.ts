import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminContractDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/contract";
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deleteButton = this.page.locator(".btn-hd-delete");
  }

  async expectLoaded(contractId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/contract/${contractId}$`));
    await expect(this.page.locator(".contract-strip").first()).toBeVisible();
  }

  async deleteContract(): Promise<void> {
    await this.deleteButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    const popup = this.page.locator(".swal2-popup");
    await expect(popup).toBeVisible();
    await expect(popup).not.toContainText(/đang xử lý|vui lòng đợi/i);
  }
}
