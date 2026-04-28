import { expect, type Locator } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class CustomerTransactionHistoryPage extends RoutedCrudListPage {
  protected readonly path = "/customer/transaction/history";

  private readonly monthSelect = this.page.locator('[name="month"]');
  private readonly yearSelect = this.page.locator('[name="year"]');
  private readonly transactionFilterForm = this.page.locator("#filterForm");
  private readonly transactionTableBody = this.page.locator("#transactionTableBody");
  private readonly resultBanner = this.page.locator("#totalTransactionSearch");
  private readonly pagination = this.page.locator("#transactionPagination");

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/transaction\/history/);
    await expect(this.transactionFilterForm).toBeVisible();
    await expect(this.transactionTableBody).toBeVisible();
  }

  async expectSummaryVisible(): Promise<void> {
    await expect(this.page.locator(".stats-bar")).toBeVisible();
    await expect(this.page.locator(".stats-bar .stat-item")).toHaveCount(2);
  }

  async expectSummaryValues(totalTransactions: number, totalAmountText: string): Promise<void> {
    const stats = this.page.locator(".stats-bar .stat-item");
    await expect(stats.nth(0)).toContainText(String(totalTransactions));
    await expect(stats.nth(1)).toContainText(totalAmountText);
  }

  async filterByMonth(month: number | string): Promise<void> {
    await this.monthSelect.selectOption(String(month));
  }

  async filterByYear(year: number | string): Promise<void> {
    await this.yearSelect.selectOption(String(year));
  }

  async submitFilters(): Promise<void> {
    await this.firstVisible(this.transactionFilterForm.locator(".btn-filter, button[type='submit']")).click();
  }

  async resetFilters(): Promise<void> {
    await this.firstVisible(this.transactionFilterForm.locator(".btn-reset, button[type='button']")).click();
  }

  async expectResultCountBanner(total: number): Promise<void> {
    await expect(this.resultBanner).toBeVisible();
    await expect(this.resultBanner).toContainText(String(total));
  }

  rowByBuildingName(buildingName: string): Locator {
    return this.firstVisible(this.transactionTableBody.locator("tr").filter({ hasText: buildingName }));
  }

  async openTransactionDetail(buildingName: string): Promise<void> {
    await this.rowByBuildingName(buildingName).click();
  }

  async expectDetailModalContains(text: string | RegExp): Promise<void> {
    const modal = this.page.locator(".modal.show");
    await expect(modal).toBeVisible();
    const modalText = await this.locatorLooseText(modal);
    if (typeof text === "string") {
      expect(modalText).toContain(this.normalizeLooseText(text));
      return;
    }

    expect(modalText).toMatch(new RegExp(this.normalizeLooseText(text.source), text.flags.replace("g", "")));
  }

  async closeDetailModal(): Promise<void> {
    const modal = this.page.locator(".modal.show");
    await this.firstVisible(modal.locator(".modal-header .btn-close, .modal-footer button")).click();
    await expect(modal).toBeHidden();
  }

  async expectEmptyState(): Promise<void> {
    await expect.poll(() => this.locatorLooseText(this.transactionTableBody)).toMatch(/khong co giao dich nao/i);
  }

  async expectPaginationHidden(): Promise<void> {
    await expect(this.pagination).toBeEmpty();
  }
}
