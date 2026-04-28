import { expect, type Locator, type Page } from "@playwright/test";

export class PaginationComponent {
  constructor(private readonly page: Page, private readonly selector = "#pagination, #paginationContainer, .pagination") {}

  container(): Locator {
    return this.page.locator(this.selector);
  }

  buttons(): Locator {
    return this.container().locator("button, a");
  }

  async expectVisible(): Promise<void> {
    await expect(this.container().filter({ visible: true }).first()).toBeVisible();
  }

  async expectHiddenOrEmpty(): Promise<void> {
    const visibleButtons = await this.buttons().filter({ visible: true }).count();
    if (visibleButtons === 0) {
      expect(visibleButtons).toBe(0);
      return;
    }

    await expect(this.container()).toBeHidden();
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.buttons().filter({ hasText: String(pageNumber) }).first().click();
  }
}
