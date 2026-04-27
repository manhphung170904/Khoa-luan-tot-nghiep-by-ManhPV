import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffCustomerListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/customers";
  readonly tableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.tableBody = this.page.locator("#customerTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/customers/);
    await expect(this.page).toHaveTitle(/Quan ly Khach hang|Quản lý Khách hàng|customer/i);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#customerTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async filterByFullName(fullName: string): Promise<void> {
    await this.fillFilter("fullName", fullName);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  rowByCustomerName(name: string): Locator {
    return this.firstVisible(this.page.locator("#customerTableBody tr").filter({ hasText: name }));
  }

  async openCustomerDetail(name: string): Promise<void> {
    await this.rowByCustomerName(name).locator(".btn-view").click();
  }

  async expectDetailModalContains(name: string): Promise<void> {
    await expect(this.page.locator(".modal.show")).toContainText(name);
  }
}
