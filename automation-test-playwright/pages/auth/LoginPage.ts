import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleLoginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.anyLocator('[data-testid="login-username"]', "#username", '[name="username"]');
    this.passwordInput = this.anyLocator('[data-testid="login-password"]', "#password", '[name="password"]');
    this.submitButton = this.anyLocator('[data-testid="login-submit"]', ".login-button", 'button[type="submit"]');
    this.googleLoginButton = this.anyLocator('[data-testid="login-google"]', 'a[href="/oauth2/authorization/google"]');
    this.forgotPasswordLink = this.anyLocator('[data-testid="forgot-password-link"]', 'a[href="/forgot-password"]');
    this.registerLink = this.anyLocator('[data-testid="register-link"]', 'a[href="/register"]');
  }

  async open(): Promise<void> {
    await this.visit("/login");
  }

  async login(username: string, password: string): Promise<void> {
    await this.dismissSweetAlertIfPresent();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await this.dismissSweetAlertIfPresent();
  }

  async expectPopupContains(text: string | RegExp): Promise<void> {
    await expect(this.toastPopup()).toBeVisible();
    await expect(this.toastPopup()).toContainText(text);
  }
}
