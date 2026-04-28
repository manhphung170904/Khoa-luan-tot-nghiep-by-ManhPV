import { expect, type Locator, type Page } from "@playwright/test";

export class TableComponent {
  constructor(
    private readonly page: Page,
    private readonly bodySelector: string,
    private readonly emptySelector = ".empty-state"
  ) {}

  body(): Locator {
    return this.page.locator(this.bodySelector);
  }

  rows(): Locator {
    return this.body().locator("tr");
  }

  rowByText(text: string | RegExp): Locator {
    return this.rows().filter({ hasText: text }).filter({ visible: true }).first();
  }

  async waitForDataOrEmpty(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.rows().count()) > 0;
      const hasEmpty = await this.page.locator(this.emptySelector).isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }
}
