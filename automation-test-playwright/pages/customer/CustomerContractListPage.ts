import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class CustomerContractListPage extends RoutedCrudListPage {
  protected readonly path = "/customer/contract/list";
  readonly list: Locator;

  constructor(page: Page) {
    super(page);
    this.list = this.page.locator("#contractList");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/contract\/list|\/customer\/contracts/);
    await expect(this.page).toHaveTitle(/Hop dong|Hợp đồng|contract/i);
    await expect(this.list).toBeVisible();
  }

  async waitForContractData(): Promise<void> {
    await expect(async () => {
      const hasCards = (await this.page.locator("#contractList .contract-container").count()) > 0;
      const hasEmpty = await this.page.locator("#contractList .empty-state").isVisible().catch(() => false);
      expect(hasCards || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async filterByBuilding(buildingId: number | string): Promise<void> {
    await this.selectFilter("buildingId", String(buildingId));
  }

  async filterByStatus(status: "ACTIVE" | "EXPIRED"): Promise<void> {
    await this.selectFilter("status", status);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  cardByBuildingName(name: string): Locator {
    return this.firstVisible(this.page.locator("#contractList .contract-container").filter({ hasText: name }));
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.locator("#contractList .empty-state")).toBeVisible();
  }
}
