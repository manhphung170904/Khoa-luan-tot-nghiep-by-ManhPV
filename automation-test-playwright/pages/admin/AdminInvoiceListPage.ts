import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminInvoiceListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/invoice/list";

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/invoice/");
  }

  async openEdit(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/invoice/edit/");
  }
}
