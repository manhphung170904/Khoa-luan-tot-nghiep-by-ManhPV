import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminSaleContractListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/sale-contract/list";

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator("#saleContractTableBody")).toBeVisible();
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/sale-contract/");
  }

  async openFirstDetail(): Promise<void> {
    await this.clickFirstRowLink("/admin/sale-contract/");
  }
}
