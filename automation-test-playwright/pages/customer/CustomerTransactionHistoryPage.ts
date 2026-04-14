import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class CustomerTransactionHistoryPage extends RoutedCrudListPage {
  protected readonly path = "/customer/transaction/history";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Lịch Sử Giao Dịch|transaction/i);
  }
}
