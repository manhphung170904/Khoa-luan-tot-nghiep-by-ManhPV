import { expect } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminSaleContractDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/sale-contract";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Chi tiết Hợp đồng mua bán|sale contract/i);
  }
}
