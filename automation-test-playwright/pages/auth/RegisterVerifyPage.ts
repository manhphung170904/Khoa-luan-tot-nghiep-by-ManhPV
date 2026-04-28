import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class RegisterVerifyPage extends BasePage {
  readonly otpInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.otpInput = this.firstVisible(page.locator('input[name="otp"]'));
    this.verifyButton = this.firstVisible(this.anyLocator(
      '[data-testid="register-verify-submit"]',
      'form[action="/auth/register/verify"] button[type="submit"]',
      "button.submit",
      'button:has-text("Xác nhận")'
    ));
  }

  async open(email: string): Promise<void> {
    await this.visit(`/register/verify?email=${encodeURIComponent(email)}`);
  }

  async expectLoaded(email?: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/register\/verify/);
    await expect(this.otpInput).toBeVisible();
    await expect(this.verifyButton).toBeVisible();
    await this.dismissSweetAlertIfPresent();
    if (email) {
      await expect(this.page.locator("body")).toContainText(email);
    }
  }

  async verifyOtp(otp: string): Promise<void> {
    await this.dismissSweetAlertIfPresent();
    await this.otpInput.fill(otp);
    await this.verifyButton.click();
  }

  async expectPopupContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
