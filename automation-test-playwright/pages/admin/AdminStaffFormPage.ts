import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminStaffFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/admin/staff/add";
  readonly form: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.page.locator("#staffForm");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/staff\/add/);
    await expect(this.form).toBeVisible();
  }

  async fillStaffBasics(data: {
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

  async selectRole(role: "STAFF" | "ADMIN"): Promise<void> {
    const selector = role === "ADMIN" ? "#roleAdmin" : "#roleStaff";
    await this.page.locator(selector).check();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
