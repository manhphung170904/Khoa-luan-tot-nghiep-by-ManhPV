import { expect, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class LoginSuccessPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(target?: string): Promise<void> {
    const suffix = target ? `?target=${encodeURIComponent(target)}` : "";
    await this.visit(`/login-success${suffix}`);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login-success/);
    await expect(this.page.locator("body")).toContainText(/Đang đăng nhập|Đang chuyển hướng/i);
  }

  async expectRedirectTarget(targetPath: string): Promise<void> {
    await this.expectPath(new RegExp(targetPath));
  }
}
