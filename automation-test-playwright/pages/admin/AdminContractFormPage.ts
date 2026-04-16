import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminContractFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/api/v1/admin/contracts";
  protected readonly editPath = "/admin/contract/edit";
}

