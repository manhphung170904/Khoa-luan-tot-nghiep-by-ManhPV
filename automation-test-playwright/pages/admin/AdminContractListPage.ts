import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminContractListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/contract/list";

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/contract/");
  }

  async openEdit(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/contract/edit/");
  }
}
