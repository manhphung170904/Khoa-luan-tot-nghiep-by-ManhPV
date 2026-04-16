import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminInvoiceFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/api/v1/admin/invoices";
  protected readonly editPath = "/admin/invoice/edit";
}

