import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminBuildingListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/building/list";

  async filterByName(name: string): Promise<void> {
    await this.fillFilter("name", name);
  }

  async filterByDistrict(districtId: string): Promise<void> {
    await this.selectFilter("districtId", districtId);
  }

  async openDetail(name: string): Promise<void> {
    await this.clickRowLink(name, "/admin/building/");
  }

  async openEdit(name: string): Promise<void> {
    await this.clickRowLink(name, "/admin/building/edit/");
  }

  async openAdditionalInformation(name: string): Promise<void> {
    await this.clickRowLink(name, "/admin/building-additional-information/");
  }
}
