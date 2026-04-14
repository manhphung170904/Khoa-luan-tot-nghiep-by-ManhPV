import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffCustomerListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/customers";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Quản lý Khách hàng|customer/i);
  }
}
