import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CrudDetailPage extends BasePage {
  readonly pageHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeader = this.firstVisible(page.locator("h1, h2"));
  }

  async expectHeaderContains(text: string): Promise<void> {
    await expect(this.pageHeader).toContainText(text);
  }
}
