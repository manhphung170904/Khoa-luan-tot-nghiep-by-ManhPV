import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class NavigationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(path: string, _options?: unknown): Promise<void> {
    await this.visit(path);
  }
}
