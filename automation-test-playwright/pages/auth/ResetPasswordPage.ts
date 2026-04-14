import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class ResetPasswordPage extends BasePage {
  readonly otpInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.otpInput = this.anyLocator('[data-testid="reset-password-otp"]', 'input[name="otp"]').first();
    this.newPasswordInput = this.anyLocator(
      '[data-testid="reset-password-new"]',
      'input[name="newPassword"]'
    ).first();
    this.confirmPasswordInput = this.anyLocator(
      '[data-testid="reset-password-confirm"]',
      'input[name="confirmPassword"]'
    ).first();
    this.submitButton = this.anyLocator(
      '[data-testid="reset-password-submit"]',
      'button[type="submit"]'
    ).first();
  }

  async open(email: string): Promise<void> {
    await this.visit(`/auth/reset-password?email=${encodeURIComponent(email)}`);
  }

  async resetPassword(otp: string, password: string, confirmPassword = password): Promise<void> {
    await this.otpInput.fill(otp);
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.submitButton.click();
  }
}
