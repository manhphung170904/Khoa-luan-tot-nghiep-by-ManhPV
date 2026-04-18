import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class ForgotPasswordPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.anyLocator('[data-testid="forgot-password-email"]', 'input[name="email"]', 'input[type="email"]').first();
    this.submitButton = this.anyLocator('[data-testid="forgot-password-submit"]', 'button[type="submit"]').first();
  }

  async open(): Promise<void> {
    await this.visit("/forgot-password");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/forgot-password/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async submitEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async expectPopupContains(text: string | RegExp): Promise<void> {
    await expect(this.toastPopup()).toBeVisible();
    await expect(this.toastPopup()).toContainText(text);
  }
}
