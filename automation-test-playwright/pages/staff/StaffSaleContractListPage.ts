import { expect, type Locator } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { StaffRoutedPage } from "../core/StaffRoutedPage";

export class StaffSaleContractListPage extends StaffRoutedPage {
  protected readonly path = "/staff/sale-contracts";

  private readonly filterForm = this.page.locator("#filterForm");
  private readonly tableBody = this.page.locator("#saleContractTableBody");
  private readonly pagination = this.page.locator("#pagination");
  private readonly table = new TableComponent(this.page, "#saleContractTableBody");

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/sale-contracts/);
    await expect(this.filterForm).toBeVisible();
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(this.tableBody).toBeVisible();
    await this.table.waitForDataOrEmpty();
  }

  async filterByCustomerId(customerId: number | string): Promise<void> {
    await this.filterForm.locator('[name="customerId"]').selectOption(String(customerId));
  }

  async filterByBuildingId(buildingId: number | string): Promise<void> {
    await this.filterForm.locator('[name="buildingId"]').selectOption(String(buildingId));
  }

  async filterByStatus(status: "0" | "1"): Promise<void> {
    await this.filterForm.locator('[name="status"]').selectOption(status);
  }

  async submitFilters(): Promise<void> {
    await this.firstVisible(this.filterForm.locator(".btn-filter.btn-search, button[type='submit']")).click();
  }

  async resetFilters(): Promise<void> {
    await this.firstVisible(this.filterForm.locator(".btn-filter.btn-reset, button[type='button']")).click();
  }

  rowByBuildingName(buildingName: string): Locator {
    return this.table.rowByText(buildingName);
  }

  async expectRowVisible(buildingName: string): Promise<void> {
    await expect(this.rowByBuildingName(buildingName)).toBeVisible();
  }

  async openDetail(buildingName: string): Promise<void> {
    await this.rowByBuildingName(buildingName).locator(".btn-view").click();
  }

  async expectDetailModalContains(text: string | RegExp): Promise<void> {
    const modal = this.page.locator(".modal.show");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(text);
  }

  async closeDetailModal(): Promise<void> {
    const modal = this.page.locator(".modal.show");
    await this.firstVisible(modal.locator(".modal-header .btn-close, .modal-footer button")).click();
    await expect(modal).toBeHidden();
  }

  async expectEmptyState(): Promise<void> {
    await expect.poll(() => this.locatorLooseText(this.tableBody)).toMatch(/khong co du lieu/i);
  }

  async expectPaginationVisible(): Promise<void> {
    await expect(this.pagination).toBeVisible();
  }
}
