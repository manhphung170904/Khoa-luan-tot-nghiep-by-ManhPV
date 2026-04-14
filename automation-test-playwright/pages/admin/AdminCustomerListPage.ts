import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminCustomerListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/customer/list";

  async openDetail(customerText: string): Promise<void> {
    await this.clickRowLink(customerText, "/admin/customer/");
  }
}
