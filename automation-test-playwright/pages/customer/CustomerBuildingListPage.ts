import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class CustomerBuildingListPage extends RoutedCrudListPage {
  protected readonly path = "/customer/building/list";
  readonly list: Locator;
  private currentModalTarget: string | null = null;
  private currentBuildingName: string | null = null;

  constructor(page: Page) {
    super(page);
    this.list = this.page.locator("#buildingList");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/building\/list/);
    await expect(this.list).toBeVisible();
  }

  async waitForBuildingData(): Promise<void> {
    await expect(async () => {
      const hasCards = (await this.page.locator("#buildingList .building-card").count()) > 0;
      const hasEmpty = await this.page.locator("#buildingList .empty-state").isVisible().catch(() => false);
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
    return this.firstVisible(this.page.locator("#buildingList .building-card").filter({ hasText: name }));
  }

  private detailModalByName(name: string): Locator {
    if (this.currentModalTarget) {
      return this.lastVisible(this.page.locator(this.currentModalTarget).filter({ hasText: name }));
    }

    return this.lastVisible(this.page.locator("#modalContainer .modal").filter({ hasText: name }));
  }

  async openBuildingDetail(name: string): Promise<void> {
    const card = this.cardByBuildingName(name);
    await expect(card).toBeVisible();
    this.currentBuildingName = name;
    this.currentModalTarget = await card.getAttribute("data-bs-target");
    await card.click();

    if (!this.currentModalTarget) {
      return;
    }
    await expect(this.detailModalByName(name)).toBeVisible();
  }

  async expectDetailModalContains(name: string): Promise<void> {
    const modal = this.detailModalByName(this.currentBuildingName ?? name);
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(name);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.locator("#buildingList .empty-state")).toBeVisible();
  }
}
