import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class CustomerContractListPage extends RoutedCrudListPage {
  protected readonly path = "/customer/contract/list";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Danh Sách Hợp Đồng|Hợp Đồng|contract/i);
  }
}
