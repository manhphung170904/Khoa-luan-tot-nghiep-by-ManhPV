import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export abstract class RoutedPage extends BasePage {
  protected abstract readonly path: string;

  async open(): Promise<void> {
    await this.visit(this.path);
  }
}
