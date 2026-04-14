import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";

export class PublicLandingPage extends BasePage {
  readonly filterForm: Locator;
  readonly buildingNameInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly buildingList: Locator;

  constructor(page: Page) {
    super(page);
    this.filterForm = this.anyLocator('[data-testid="public-filter-form"]', "#filterForm", "form");
    this.buildingNameInput = this.anyLocator('[data-testid="public-building-name"]', '[name="name"]').first();
    this.searchButton = this.anyLocator('[data-testid="public-search"]', 'button[type="submit"]').first();
    this.resetButton = this.anyLocator('[data-testid="public-reset"]', 'button[type="reset"]').first();
    this.buildingList = this.anyLocator('[data-testid="public-building-list"]', "#buildingList");
  }

  async open(): Promise<void> {
    await this.visit("/suntower");
  }

  async searchByBuildingName(name: string): Promise<void> {
    await this.buildingNameInput.fill(name);
    await this.searchButton.click();
  }

  async searchBuilding(name: string): Promise<void> {
    await this.searchByBuildingName(name);
  }

  async selectDistrict(value: string): Promise<void> {
    await this.anyLocator('[data-testid="public-district"]', '[name="districtId"]').selectOption(value);
  }

  async selectDistrictIfAvailable(value: string): Promise<boolean> {
    return OptionalActionHelper.selectIfPresent(this.anyLocator('[data-testid="public-district"]', '[name="districtId"]'), value);
  }

  async resetFilters(): Promise<void> {
    await this.resetButton.click();
  }

  async resetFiltersIfAvailable(): Promise<boolean> {
    return OptionalActionHelper.clickIfPresent(this.resetButton);
  }

  async openBuildingDetailsByName(name: string): Promise<void> {
    await this.page.locator('[data-testid="building-card"], .building-card', { hasText: name }).first().click();
  }

  async expectResultsLoaded(): Promise<void> {
    await expect(this.buildingList).toBeVisible();
  }

  async assertLoaded(): Promise<void> {
    await this.expectResultsLoaded();
  }
}
