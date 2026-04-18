import { expect, type Locator } from "@playwright/test";
import { StaffRoutedPage } from "../core/StaffRoutedPage";

export class StaffSaleContractListPage extends StaffRoutedPage {
  protected readonly path = "/staff/sale-contracts";

  private readonly filterForm = this.page.locator("#filterForm");
  private readonly tableBody = this.page.locator("#saleContractTableBody");
  private readonly pagination = this.page.locator("#pagination");

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/sale-contracts/);
    await expect(this.filterForm).toBeVisible();
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(this.tableBody).toBeVisible();
    await expect(async () => {
      const rows = await this.tableBody.locator("tr").count();
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(rows > 0 || hasEmpty).toBeTruthy();
    }).toPass();
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
    await this.filterForm.locator(".btn-filter.btn-search, button[type='submit']").first().click();
  }

  async resetFilters(): Promise<void> {
    await this.filterForm.locator(".btn-filter.btn-reset, button[type='button']").first().click();
  }

  rowByBuildingName(buildingName: string): Locator {
    return this.tableBody.locator("tr").filter({ hasText: buildingName }).first();
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
    await modal.locator(".modal-header .btn-close, .modal-footer button").first().click();
    await expect(modal).toBeHidden();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.tableBody).toContainText(/Không có dữ liệu|KhÃ´ng cÃ³ dá»¯ liá»‡u/i);
  }

  async expectPaginationVisible(): Promise<void> {
    await expect(this.pagination).toBeVisible();
  }
}
