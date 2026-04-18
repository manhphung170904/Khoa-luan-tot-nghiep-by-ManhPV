import { expect } from "@playwright/test";
import { AdminRoutedPage } from "../core/AdminRoutedPage";

export class AdminReportPage extends AdminRoutedPage {
  protected readonly path = "/admin/report";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/report/);
    await expect(this.page.locator(".year-select, select[name='year']")).toBeVisible();
    await expect(this.page.locator("#monthlyRevenueChart")).toBeVisible();
  }

  async expectOverviewVisible(): Promise<void> {
    await expect(this.page.locator(".stat-card")).toHaveCount(3);
    await expect(this.page.locator("#monthlyRevenueChart")).toBeVisible();
    await expect(this.page.locator("#rentGrowthChart")).toBeVisible();
    await expect(this.page.locator("#yearlyRevenueChart")).toBeVisible();
    await expect(this.page.locator("#propertyTypeChart")).toBeVisible();
    await expect(this.page.locator("#topBuildingChart")).toBeVisible();
  }

  async selectYear(value: string): Promise<void> {
    await this.page.locator(".year-select, select[name='year']").first().selectOption(value);
  }

  async submitYearFilter(): Promise<void> {
    const submitButton = this.page.locator("form.year-selector-form button, button[type='submit']").first();
    if (await submitButton.count()) {
      await submitButton.click();
    }
  }

  async expectYearSelected(value: string): Promise<void> {
    await expect(this.page.locator(".year-select, select[name='year']").first()).toHaveValue(value);
  }

  async triggerPrint(): Promise<void> {
    await this.page.locator('button[onclick*="window.print"]').click();
  }
}
