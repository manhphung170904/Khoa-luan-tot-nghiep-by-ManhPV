import { type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class LoginSuccessPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(target?: string): Promise<void> {
    const suffix = target ? `?target=${encodeURIComponent(target)}` : "";
    await this.visit(`/login-success${suffix}`);
  }

  async expectRedirectTarget(targetPath: string): Promise<void> {
    await this.expectPath(new RegExp(targetPath));
  }
}
