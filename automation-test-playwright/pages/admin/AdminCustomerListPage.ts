import { expect, type Locator, type Page } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminCustomerListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/customer/list";
  readonly addButton: Locator;
  readonly tableBody: Locator;
  private readonly table: TableComponent;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-add");
    this.tableBody = this.page.locator("#customerTableBody");
    this.table = new TableComponent(page, "#customerTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/customer\/(list|search)/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await this.table.waitForDataOrEmpty();
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
  }

  rowByCustomerName(name: string): Locator {
    return this.table.rowByText(name);
  }

  async filterByFullName(fullName: string): Promise<void> {
    await this.fillFilter("fullName", fullName);
  }

  async openDetail(customerText: string): Promise<void> {
    await this.clickRowLink(customerText, "/admin/customer/");
  }

  async deleteCustomer(customerText: string): Promise<void> {
    await this.actionButton(this.rowByCustomerName(customerText), "delete").click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await super.confirmSweetAlert();
  }
}
