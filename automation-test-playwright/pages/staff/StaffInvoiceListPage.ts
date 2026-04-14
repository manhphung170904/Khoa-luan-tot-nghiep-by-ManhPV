import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffInvoiceListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/invoices";

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('a.nav-link.active[href="/staff/invoices"]')).toBeVisible();
    await expect(this.page.locator("h1").first()).toBeVisible();
  }
}
