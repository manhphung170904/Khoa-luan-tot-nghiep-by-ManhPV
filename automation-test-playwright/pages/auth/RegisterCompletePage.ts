import { expect, type Locator, type Page } from "@playwright/test";
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
      "button.submit",
      'button:has-text("Tạo tài khoản")'
    ).first();
  }

  async open(ticket: string, email: string): Promise<void> {
    await this.visit(`/register/complete?ticket=${encodeURIComponent(ticket)}&email=${encodeURIComponent(email)}`);
  }

  async expectLoaded(email?: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/register\/complete/);
    await expect(this.fullNameInput).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.completeButton).toBeVisible();
    await this.dismissSweetAlertIfPresent();
    if (email) {
      await expect(this.page.locator("body")).toContainText(email);
    }
  }

  async completeRegistration(fullName: string, username: string, password: string, confirmPassword = password): Promise<void> {
    await this.dismissSweetAlertIfPresent();
    await this.fullNameInput.fill(fullName);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.completeButton.click();
  }

  async expectPopupContains(text: string | RegExp): Promise<void> {
    await expect(this.toastPopup()).toBeVisible();
    await expect(this.toastPopup()).toContainText(text);
  }
}
