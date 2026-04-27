import { expect, type Locator, type Page } from "@playwright/test";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";
import { BasePage } from "./BasePage";

export class CrudListPage extends BasePage {
  readonly tableBody: Locator;
  readonly filterForm: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tableBody = page.locator("tbody");
    this.filterForm = this.firstVisible(page.locator("form"));
    this.searchButton = page.locator("form button[type='submit'], .btn-filter.btn-search");
    this.resetButton = page.locator(".btn-filter.btn-reset, form button[type='reset']");
  }

  async search(): Promise<void> {
    const button = this.firstVisible(this.searchButton);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
  }

  async searchIfAvailable(): Promise<boolean> {
    if (!(await this.searchButton.count())) {
      return false;
    }

    const button = this.firstVisible(this.searchButton);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    return true;
  }

  async resetFilters(): Promise<void> {
    if (await this.resetButton.count()) {
      await this.firstVisible(this.resetButton).click();
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
    return this.firstVisible(this.page.locator("tbody tr", { hasText: text }));
  }

  firstRowLink(hrefPart: string): Locator {
    return this.firstVisible(this.page.locator(`tbody a[href*="${hrefPart}"]`));
  }

  firstViewButton(): Locator {
    return this.firstVisible(this.page.locator('tbody .btn-view, tbody a[title*="Xem"]'));
  }

  firstEditButton(): Locator {
    return this.firstVisible(this.page.locator('tbody .btn-edit, tbody a[title*="Chỉnh"], tbody a[title*="Chinh"], tbody a[title*="Sửa"], tbody a[title*="Sua"]'));
  }

  async clickRowLink(rowText: string, hrefPart: string): Promise<void> {
    await this.firstVisible(this.rowByText(rowText).locator(`a[href*="${hrefPart}"]`)).click();
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
    await this.firstVisible(this.rowByText(rowText).locator('[title*="Xóa"], [title*="Xoa"], .btn-delete')).click();
  }

  async expectRowVisible(text: string): Promise<void> {
    await expect(this.rowByText(text)).toBeVisible();
  }
}
