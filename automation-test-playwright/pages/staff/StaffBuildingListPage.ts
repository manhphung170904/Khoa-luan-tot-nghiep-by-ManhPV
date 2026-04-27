import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffBuildingListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/buildings";
  readonly list: Locator;

  constructor(page: Page) {
    super(page);
    this.list = this.page.locator("#buildingCardsContainer");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/buildings/);
    await expect(this.page.locator('a.nav-link.active[href="/staff/buildings"]')).toBeVisible();
    await expect(this.list).toBeVisible();
  }

  async waitForBuildingData(): Promise<void> {
    await expect(async () => {
      const hasCards = (await this.page.locator("#buildingCardsContainer .building-card").count()) > 0;
      const hasEmpty = await this.page.locator("#buildingCardsContainer .empty-state").isVisible().catch(() => false);
      expect(hasCards || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async filterByName(name: string): Promise<void> {
    await this.fillFilter("name", name);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  cardByBuildingName(name: string): Locator {
    return this.firstVisible(this.page.locator("#buildingCardsContainer .building-card").filter({ hasText: name }));
  }

  async openBuildingDetail(name: string): Promise<void> {
    await this.cardByBuildingName(name).locator(".btn-view-detail").click();
  }

  async expectDetailModalContains(name: string): Promise<void> {
    await expect(this.page.locator("#modalContainer .modal.show")).toContainText(name);
  }
}
