import { expect, type Locator, type Page } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminSaleContractListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/sale-contract/list";
  readonly addButton: Locator;
  readonly tableBody: Locator;
  private readonly table: TableComponent;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-add");
    this.tableBody = this.page.locator("#saleContractTableBody");
    this.table = new TableComponent(page, "#saleContractTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/sale-contract\/(list|search)/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await this.table.waitForDataOrEmpty();
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
  }

  async filterByCustomer(customerId: number | string): Promise<void> {
    await this.selectFilter("customerId", String(customerId));
  }

  async filterByBuilding(buildingId: number | string): Promise<void> {
    await this.selectFilter("buildingId", String(buildingId));
  }

  async filterByStaff(staffId: number | string): Promise<void> {
    await this.selectFilter("staffId", String(staffId));
  }

  async filterByStatus(status: "0" | "1"): Promise<void> {
    await this.selectFilter("status", status);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  rowBySaleContractText(text: string): Locator {
    return this.table.rowByText(text);
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/sale-contract/");
  }

  async openEdit(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/sale-contract/edit/");
  }

  async deleteSaleContract(text: string): Promise<void> {
    await this.actionButton(this.rowBySaleContractText(text), "delete").click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
