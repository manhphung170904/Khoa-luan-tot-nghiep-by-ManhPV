import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class RegisterCompletePage extends BasePage {
  readonly fullNameInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly completeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.fullNameInput = page.locator('input[name="fullName"]').first();
    this.usernameInput = page.locator('input[name="username"]').first();
    this.passwordInput = page.locator('input[name="password"]').first();
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]').first();
    this.completeButton = this.anyLocator(
      '[data-testid="register-complete-submit"]',
      'form[action="/auth/register/complete"] button[type="submit"]',
      'button.submit',
      'button:has-text("Tạo tài khoản")'
    ).first();
  }

  async open(ticket: string, email: string): Promise<void> {
    await this.visit(`/register/complete?ticket=${encodeURIComponent(ticket)}&email=${encodeURIComponent(email)}`);
  }

  async completeRegistration(fullName: string, username: string, password: string, confirmPassword = password): Promise<void> {
    await this.fullNameInput.fill(fullName);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.completeButton.click();
  }
}
