import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class RegisterVerifyPage extends BasePage {
  readonly otpInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.otpInput = page.locator('input[name="otp"]').first();
    this.verifyButton = this.anyLocator(
      '[data-testid="register-verify-submit"]',
      'form[action="/auth/register/verify"] button[type="submit"]',
      'button.submit',
      'button:has-text("Xác nhận")'
    ).first();
  }

  async open(email: string): Promise<void> {
    await this.visit(`/register/verify?email=${encodeURIComponent(email)}`);
  }

  async verifyOtp(otp: string): Promise<void> {
    await this.otpInput.fill(otp);
    await this.verifyButton.click();
  }
}
