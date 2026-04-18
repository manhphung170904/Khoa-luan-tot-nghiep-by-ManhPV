import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class ResetPasswordPage extends BasePage {
  readonly otpInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.otpInput = this.anyLocator('[data-testid="reset-password-otp"]', 'input[name="otp"]').first();
    this.newPasswordInput = this.anyLocator('[data-testid="reset-password-new"]', 'input[name="newPassword"]').first();
    this.confirmPasswordInput = this.anyLocator('[data-testid="reset-password-confirm"]', 'input[name="confirmPassword"]').first();
    this.submitButton = this.anyLocator('[data-testid="reset-password-submit"]', 'button[type="submit"]').first();
  }

  async open(email: string): Promise<void> {
    await this.visit(`/auth/reset-password?email=${encodeURIComponent(email)}`);
  }

  async expectLoaded(email?: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/reset-password/);
    await expect(this.otpInput).toBeVisible();
    await expect(this.newPasswordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    if (email) {
      await expect(this.page.locator("#emailDisplay")).toHaveValue(email);
    }
  }

  async resetPassword(otp: string, password: string, confirmPassword = password): Promise<void> {
    await this.otpInput.fill(otp);
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.submitButton.click();
  }

  async resendOtp(): Promise<void> {
    await this.page.getByRole("button", { name: /Gửi lại mã/i }).click();
  }

  async expectPopupContains(text: string | RegExp): Promise<void> {
    await expect(this.toastPopup()).toBeVisible();
    await expect(this.toastPopup()).toContainText(text);
  }
}
