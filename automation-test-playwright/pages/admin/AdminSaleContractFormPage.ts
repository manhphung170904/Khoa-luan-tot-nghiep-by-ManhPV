import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminSaleContractFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/api/v1/admin/sale-contracts";
  protected readonly editPath = "/admin/sale-contract/edit";
}

