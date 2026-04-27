import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";

export class PublicLandingPage extends BasePage {
  readonly filterForm: Locator;
  readonly filterBody: Locator;
  readonly toggleFilterButton: Locator;
  readonly buildingNameInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly totalBuilding: Locator;
  readonly buildingList: Locator;
  readonly buildingCards: Locator;
  readonly emptyState: Locator;
  readonly paginationContainer: Locator;
  readonly paginationButtons: Locator;
  readonly detailModal: Locator;
  readonly detailModalTitle: Locator;
  readonly detailModalBody: Locator;
  readonly detailModalCloseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.filterForm = this.anyLocator('[data-testid="public-filter-form"]', "#filterForm", "form");
    this.filterBody = this.anyLocator('[data-testid="public-filter-body"]', "#filterBody");
    this.toggleFilterButton = this.anyLocator('[data-testid="public-filter-toggle"]', ".btn-toggle-filter");
    this.buildingNameInput = this.firstVisible(this.anyLocator('[data-testid="public-building-name"]', '[name="name"]'));
    this.searchButton = this.firstVisible(this.anyLocator('[data-testid="public-search"]', 'button[type="submit"]'));
    this.resetButton = this.firstVisible(this.anyLocator('[data-testid="public-reset"]', ".btn-reset"));
    this.totalBuilding = this.anyLocator('[data-testid="public-total-building"]', "#totalBuilding");
    this.buildingList = this.anyLocator('[data-testid="public-building-list"]', "#buildingList");
    this.buildingCards = this.page.locator('[data-testid="building-card"], .building-card');
    this.emptyState = this.page.locator(".empty-state");
    this.paginationContainer = this.page.locator("#paginationContainer");
    this.paginationButtons = this.paginationContainer.locator("button");
    this.detailModal = this.page.locator("#modalContainer .modal.show");
    this.detailModalTitle = this.detailModal.locator(".modal-title");
    this.detailModalBody = this.detailModal.locator(".modal-body");
    this.detailModalCloseButton = this.firstVisible(this.detailModal.locator(".btn-close, .modal-footer button"));
  }

  async open(query = ""): Promise<void> {
    const normalizedQuery = query ? (query.startsWith("?") ? query : `?${query}`) : "";
    await this.visit(`/moonnest${normalizedQuery}`);
  }

  async searchByBuildingName(name: string): Promise<void> {
    await this.buildingNameInput.fill(name);
    await this.search();
  }

  async searchBuilding(name: string): Promise<void> {
    await this.searchByBuildingName(name);
  }

  filterSelect(name: string): Locator {
    return this.inputByName(name);
  }

  filterInput(name: string): Locator {
    return this.inputByName(name);
  }

  async search(): Promise<void> {
    await this.searchButton.click();
    await this.waitForResultsSettled();
  }

  async fillFilter(fieldName: string, value: string): Promise<void> {
    await this.filterInput(fieldName).fill(value);
  }

  async fillFilterIfPresent(fieldName: string, value: string): Promise<boolean> {
    return OptionalActionHelper.fillIfPresent(this.filterInput(fieldName), value);
  }

  async fillNumberRange(fieldNameFrom: string, fieldNameTo: string, fromValue: string, toValue: string): Promise<void> {
    await this.fillFilter(fieldNameFrom, fromValue);
    await this.fillFilter(fieldNameTo, toValue);
  }

  async selectFilter(fieldName: string, value: string): Promise<void> {
    await this.filterSelect(fieldName).selectOption(value);
  }

  async selectDistrict(value: string): Promise<void> {
    await this.selectFilter("districtId", value);
  }

  async selectDistrictIfAvailable(value: string): Promise<boolean> {
    return OptionalActionHelper.selectIfPresent(this.anyLocator('[data-testid="public-district"]', '[name="districtId"]'), value);
  }

  async resetFilters(): Promise<void> {
    await this.resetButton.click();
    await expect(this.buildingNameInput).toHaveValue("");
  }

  async resetFiltersIfAvailable(): Promise<boolean> {
    return OptionalActionHelper.clickIfPresent(this.resetButton);
  }

  cardByName(name: string): Locator {
    return this.firstVisible(this.page.locator('[data-testid="building-card"], .building-card', { hasText: name }));
  }

  async openBuildingDetailsByName(name: string): Promise<void> {
    await this.cardByName(name).click();
    await this.expectDetailModalVisible(name);
  }

  async openFirstBuildingDetails(): Promise<void> {
    await this.firstVisible(this.buildingCards).click();
    await expect(this.detailModal).toBeVisible();
  }

  async closeDetailModal(): Promise<void> {
    await this.detailModalCloseButton.click();
    await expect(this.detailModal).not.toBeVisible();
  }

  async clickPaginationPage(pageNumber: number): Promise<void> {
    await this.paginationButtons.getByText(String(pageNumber), { exact: true }).click();
    await this.waitForResultsSettled();
  }

  async toggleFilterPanel(): Promise<void> {
    await this.toggleFilterButton.click();
  }

  async waitForResultsSettled(): Promise<void> {
    await expect(this.buildingList).toBeVisible();
    await expect
      .poll(async () => {
        const cards = await this.buildingCards.count();
        const emptyVisible = await this.emptyState.isVisible().catch(() => false);
        const summary = (await this.totalBuilding.textContent())?.trim() ?? "";
        return cards > 0 || emptyVisible || /Tìm thấy|Tim thay/i.test(summary);
      })
      .toBeTruthy();
  }

  async waitForFilterMetadataLoaded(): Promise<void> {
    await expect.poll(() => this.optionCount("districtId")).toBeGreaterThan(1);
    await expect.poll(() => this.optionCount("ward")).toBeGreaterThan(1);
    await expect.poll(() => this.optionCount("street")).toBeGreaterThan(1);
    await expect.poll(() => this.optionCount("direction")).toBeGreaterThan(1);
    await expect.poll(() => this.optionCount("level")).toBeGreaterThan(1);
  }

  async optionCount(fieldName: string): Promise<number> {
    return this.filterSelect(fieldName).locator("option").count();
  }

  async cardCount(): Promise<number> {
    return this.buildingCards.count();
  }

  async cardNames(): Promise<string[]> {
    const names = await this.buildingCards.locator(".building-name").allTextContents();
    return names.map((name) => name.trim()).filter(Boolean);
  }

  async resultSummaryText(): Promise<string> {
    return ((await this.totalBuilding.textContent()) ?? "").trim();
  }

  async paginationCount(): Promise<number> {
    return this.paginationButtons.count();
  }

  paginationButton(pageNumber: number): Locator {
    return this.paginationButtons.getByText(String(pageNumber), { exact: true });
  }

  async activePaginationText(): Promise<string> {
    return this.paginationButtons.evaluateAll((buttons) => {
      const activeButton = buttons.find((button) => button.getAttribute("style")?.includes("font-weight:700"));
      return activeButton?.textContent?.trim() ?? "";
    });
  }

  async isFilterCollapsed(): Promise<boolean> {
    return this.filterBody.evaluate((element) => element.classList.contains("collapsed"));
  }

  async storedFilterCollapsedValue(): Promise<string | null> {
    return this.page.evaluate(() => window.localStorage.getItem("filterCollapsed"));
  }

  async filterValue(fieldName: string): Promise<string> {
    return this.filterInput(fieldName).inputValue();
  }

  async selectedValue(fieldName: string): Promise<string> {
    return this.filterSelect(fieldName).inputValue();
  }

  detailSection(title: string): Locator {
    return this.detailModalBody.locator(".info-section", {
      has: this.page.locator(".info-section-title", { hasText: title })
    });
  }

  async expectDetailModalVisible(buildingName?: string): Promise<void> {
    await expect(this.detailModal).toBeVisible();
    await expect(this.detailModalTitle).toContainText(/Thông Tin Bất Động Sản/i);
    if (buildingName) {
      await expect(this.detailModalBody).toContainText(buildingName);
    }
  }

  async expectResultsLoaded(): Promise<void> {
    await this.waitForFilterMetadataLoaded();
    await this.waitForResultsSettled();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.emptyState).toContainText(/Không tìm thấy bất động sản/i);
  }

  async expectHasResults(): Promise<void> {
    await expect(this.firstVisible(this.buildingCards)).toBeVisible();
  }

  async assertLoaded(): Promise<void> {
    await this.expectResultsLoaded();
  }
}
