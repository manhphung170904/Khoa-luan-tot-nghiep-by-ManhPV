import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminStaffListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/staff/list";

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator("#staffTableBody")).toBeVisible();
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/staff/");
  }

  async openFirstDetail(): Promise<void> {
    await this.clickFirstRowLink("/admin/staff/");
  }
}
