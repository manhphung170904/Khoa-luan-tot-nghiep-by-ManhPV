import { expect, type Locator, type Page } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffCustomerListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/customers";
  readonly tableBody: Locator;
  private readonly table: TableComponent;

  constructor(page: Page) {
    super(page);
    this.tableBody = this.page.locator("#customerTableBody");
    this.table = new TableComponent(page, "#customerTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/customers/);
    await expect(this.page).toHaveTitle(/Quan ly Khach hang|Quản lý Khách hàng|customer/i);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await this.table.waitForDataOrEmpty();
  }

  async filterByFullName(fullName: string): Promise<void> {
    await this.fillFilter("fullName", fullName);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  rowByCustomerName(name: string): Locator {
    return this.table.rowByText(name);
  }

  async openCustomerDetail(name: string): Promise<void> {
    await this.rowByCustomerName(name).locator(".btn-view").click();
  }

  async expectDetailModalContains(name: string): Promise<void> {
    await expect(this.page.locator(".modal.show")).toContainText(name);
  }
}
