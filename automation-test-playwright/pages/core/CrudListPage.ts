import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";

export class CrudListPage extends BasePage {
  readonly tableBody: Locator;
  readonly filterForm: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tableBody = page.locator("tbody");
    this.filterForm = page.locator("form").first();
    this.searchButton = page.getByRole("button", { name: /tìm kiếm|search/i });
    this.resetButton = page.getByRole("button", { name: /reset/i });
  }

  async search(): Promise<void> {
    await this.searchButton.click({ force: true });
  }

  async searchIfAvailable(): Promise<boolean> {
    if (!(await this.searchButton.count())) {
      return false;
    }

    await this.searchButton.first().click({ force: true });
    return true;
  }

  async resetFilters(): Promise<void> {
    if (await this.resetButton.count()) {
      await this.resetButton.click();
    }
  }

  async fillFilter(fieldName: string, value: string): Promise<void> {
    await this.inputByName(fieldName).fill(value);
  }

  async fillFilterIfPresent(fieldName: string, value: string): Promise<boolean> {
    return OptionalActionHelper.fillIfPresent(this.inputByName(fieldName), value);
  }

  async selectFilter(fieldName: string, value: string): Promise<void> {
    await this.inputByName(fieldName).selectOption(value);
  }

  async selectFilterIfPresent(fieldName: string, value: string): Promise<boolean> {
    return OptionalActionHelper.selectIfPresent(this.inputByName(fieldName), value);
  }

  rowByText(text: string): Locator {
    return this.page.locator("tbody tr", { hasText: text }).first();
  }

  firstRowLink(hrefPart: string): Locator {
    return this.page.locator(`tbody a[href*="${hrefPart}"]`).first();
  }

  firstViewButton(): Locator {
    return this.page.locator('tbody .btn-view, tbody a[title*="Xem"]').first();
  }

  firstEditButton(): Locator {
    return this.page.locator('tbody .btn-edit, tbody a[title*="Chỉnh"], tbody a[title*="Sửa"]').first();
  }

  async clickRowLink(rowText: string, hrefPart: string): Promise<void> {
    await this.rowByText(rowText).locator(`a[href*="${hrefPart}"]`).first().click();
  }

  async clickFirstRowLink(hrefPart: string): Promise<void> {
    await this.firstRowLink(hrefPart).click();
  }

  async clickFirstViewButton(): Promise<void> {
    await this.firstViewButton().click();
  }

  async clickFirstEditButton(): Promise<void> {
    await this.firstEditButton().click();
  }

  async deleteRow(rowText: string): Promise<void> {
    await this.rowByText(rowText).locator('[title*="Xóa"], .btn-delete').first().click();
  }

  async expectRowVisible(text: string): Promise<void> {
    await expect(this.rowByText(text)).toBeVisible();
  }
}
