import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminCustomerFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/admin/customer/add";
  readonly form: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.page.locator("#customerForm");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/customer\/add/);
    await expect(this.form).toBeVisible();
  }

  async fillCustomerBasics(data: {
    fullName?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
  }): Promise<void> {
    if (data.fullName) await this.fillTextField("fullName", data.fullName);
    if (data.email) await this.fillTextField("email", data.email);
    if (data.phone) await this.fillTextField("phone", data.phone);
    if (data.username) await this.fillTextField("username", data.username);
    if (data.password) await this.fillTextField("password", data.password);
  }

  async selectStaffIds(staffIds: number[]): Promise<void> {
    for (const staffId of staffIds) {
      await this.page.locator(`input[name="staffIds"][value="${staffId}"]`).check();
    }
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
