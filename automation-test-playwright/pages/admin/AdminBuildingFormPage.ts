import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminBuildingFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/api/v1/admin/buildings";
  protected readonly editPath = "/admin/building/edit";

  async fillBuildingBasics(data: {
    name?: string;
    districtId?: string;
    ward?: string;
    street?: string;
    level?: string;
    propertyType?: string;
    transactionType?: string;
  }): Promise<void> {
    if (data.name) await this.fillTextField("name", data.name);
    if (data.districtId) await this.selectOption("districtId", data.districtId);
    if (data.ward) await this.fillTextField("ward", data.ward);
    if (data.street) await this.fillTextField("street", data.street);
    if (data.level) await this.selectOption("level", data.level);
    if (data.propertyType) await this.selectOption("propertyType", data.propertyType);
    if (data.transactionType) await this.selectOption("transactionType", data.transactionType);
  }
}

