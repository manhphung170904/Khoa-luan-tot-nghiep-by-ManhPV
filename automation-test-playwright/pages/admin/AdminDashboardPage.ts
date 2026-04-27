import { expect, type Locator } from "@playwright/test";
import { AdminRoutedPage } from "../core/AdminRoutedPage";

export class AdminDashboardPage extends AdminRoutedPage {
  protected readonly path = "/admin/dashboard";

  private statCardByStatId(statId: string): Locator {
    return this.page.locator(`#${statId}`).locator("xpath=ancestor::div[contains(@class,'stat-card')]");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/dashboard/);
    await expect(this.page.locator("#totalBuildingsStat")).toBeVisible();
  }

  async expectOverviewVisible(): Promise<void> {
    await expect(this.page.locator("#totalBuildingsStat")).toBeVisible();
    await expect(this.page.locator("#totalCustomersStat")).toBeVisible();
    await expect(this.page.locator("#totalStaffsStat")).toBeVisible();
    await expect(this.page.locator("#totalContractsStat")).toBeVisible();
    await expect(this.page.locator("#revenueChartCombined")).toBeVisible();
    await expect(this.page.locator("#contractsByBuildingChart")).toBeVisible();
    await expect(this.page.locator("#districtChart")).toBeVisible();
    await expect(this.page.locator("#saleRateChart")).toBeVisible();
    await expect(this.page.locator("#potentialCustomersBody")).toBeVisible();
    await expect(this.page.locator("#topStaffsBody")).toBeVisible();
    await expect(this.page.locator("#recentBuildingsContainer")).toBeVisible();
  }

  async openBuildingsFromStatCard(): Promise<void> {
    await this.statCardByStatId("totalBuildingsStat").click();
  }

  async openCustomersFromStatCard(): Promise<void> {
    await this.statCardByStatId("totalCustomersStat").click();
  }

  async openStaffsFromStatCard(): Promise<void> {
    await this.statCardByStatId("totalStaffsStat").click();
  }

  async openContractsFromStatCard(): Promise<void> {
    await this.statCardByStatId("totalContractsStat").click();
  }

  async expectRecentBuildingVisible(buildingName: string): Promise<void> {
    await expect(this.firstVisible(this.page.locator("#recentBuildingsContainer .recent-item").filter({ hasText: buildingName }))).toBeVisible();
  }

  async openRecentBuilding(buildingName: string): Promise<void> {
    await this.firstVisible(this.page.locator("#recentBuildingsContainer .recent-item").filter({ hasText: buildingName })).click();
  }
}
