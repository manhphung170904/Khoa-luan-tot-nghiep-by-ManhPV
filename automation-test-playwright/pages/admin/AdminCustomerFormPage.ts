import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminCustomerFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/api/v1/admin/customers";

  async fillCustomerBasics(data: { fullName?: string; email?: string; phone?: string; username?: string; password?: string }): Promise<void> {
    if (data.fullName) await this.fillTextField("fullName", data.fullName);
    if (data.email) await this.fillTextField("email", data.email);
    if (data.phone) await this.fillTextField("phone", data.phone);
    if (data.username) await this.fillTextField("username", data.username);
    if (data.password) await this.fillTextField("password", data.password);
  }
}

