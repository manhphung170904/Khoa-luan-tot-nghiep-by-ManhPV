import { expect, type Locator, type Page } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminContractListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/contract/list";
  readonly addButton: Locator;
  readonly updateStatusesButton: Locator;
  readonly tableBody: Locator;
  private readonly table: TableComponent;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-add");
    this.updateStatusesButton = this.page.locator(".btn-update-status");
    this.tableBody = this.page.locator("#contractTableBody");
    this.table = new TableComponent(page, "#contractTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/contract\/(list|search)/);
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

  async filterByStatus(status: "ACTIVE" | "EXPIRED"): Promise<void> {
    await this.selectFilter("status", status);
  }

  async fillRentPriceRange(rentPriceFrom?: number, rentPriceTo?: number): Promise<void> {
    if (typeof rentPriceFrom === "number") {
      await this.fillFilter("rentPriceFrom", String(rentPriceFrom));
    }
    if (typeof rentPriceTo === "number") {
      await this.fillFilter("rentPriceTo", String(rentPriceTo));
    }
  }

  rowByContractText(text: string): Locator {
    return this.table.rowByText(text);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/contract/");
  }

  async openEdit(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/contract/edit/");
  }

  async deleteContract(text: string): Promise<void> {
    await this.actionButton(this.rowByContractText(text), "delete").click();
  }

  async updateStatuses(): Promise<void> {
    await this.updateStatusesButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
