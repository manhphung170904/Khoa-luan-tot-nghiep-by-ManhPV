import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.anyLocator(
      '[data-testid="register-email"]',
      'input[name="email"]',
      'input[type="email"]'
    ).first();
    this.submitButton = this.anyLocator(
      '[data-testid="register-submit"]',
      'button[type="submit"]'
    ).first();
  }

  async open(): Promise<void> {
    await this.visit("/register");
  }

  async requestRegistrationCode(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
