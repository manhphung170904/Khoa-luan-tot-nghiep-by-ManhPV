import { expect, type Locator, type Page } from "@playwright/test";
import { AdminRoutedPage } from "../core/AdminRoutedPage";

export class AdminProfilePage extends AdminRoutedPage {
  protected readonly path = "/admin/profile";
  readonly usernameValue: Locator;
  readonly emailValue: Locator;
  readonly linkedGoogleEmailValue: Locator;
  readonly phoneValue: Locator;
  readonly usernameModal: Locator;
  readonly phoneModal: Locator;
  readonly passwordModal: Locator;
  readonly usernameAction: Locator;
  readonly phoneAction: Locator;
  readonly passwordAction: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameValue = this.infoValueByLabel(/đăng nhập|dang nhap/i);
    this.emailValue = this.infoValueByLabel(/Email/i);
    this.linkedGoogleEmailValue = this.infoValueByLabel(/Email Google|Google/i);
    this.phoneValue = this.infoValueByLabel(/điện thoại|dien thoai/i);
    this.usernameModal = this.modalById("editUsernameModal");
    this.phoneModal = this.modalById("editPhoneModal");
    this.passwordModal = this.modalById("changePasswordModal");
    this.usernameAction = this.page.locator('[data-bs-target="#editUsernameModal"]').first();
    this.phoneAction = this.page.locator('[data-bs-target="#editPhoneModal"]').first();
    this.passwordAction = this.page.locator('[data-bs-target="#changePasswordModal"]').first();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/thông tin cá nhân|thong tin ca nhan|profile/i);
    await expect(this.usernameValue).toBeVisible();
    await expect(this.emailValue).toBeVisible();
    await expect(this.phoneValue).toBeVisible();
  }

  async openUsernameModal(): Promise<void> {
    if (!(await this.usernameModal.isVisible().catch(() => false))) {
      await this.usernameAction.click();
    }
    await expect(this.usernameModal).toBeVisible();
  }

  async openPhoneModal(): Promise<void> {
    if (!(await this.phoneModal.isVisible().catch(() => false))) {
      await this.phoneAction.click();
    }
    await expect(this.phoneModal).toBeVisible();
  }

  async openPasswordModal(): Promise<void> {
    if (!(await this.passwordModal.isVisible().catch(() => false))) {
      await this.passwordAction.click();
    }
    await expect(this.passwordModal).toBeVisible();
  }

  async sendOtpFromModal(modal: "username" | "phone" | "password"): Promise<void> {
    await this.modalContainer(modal).getByRole("button", { name: /gửi mã|gui ma|otp/i }).click();
  }

  async submitUsernameChange(newUsername: string, otp: string): Promise<void> {
    await this.openUsernameModal();
    await this.usernameModal.locator('[name="newUsername"]').fill(newUsername);
    await this.usernameModal.locator("#usernameOtp").fill(otp);
    await this.usernameModal.getByRole("button", { name: /xác nhận|xac nhan/i }).click();
  }

  async submitPhoneChange(newPhoneNumber: string, otp: string): Promise<void> {
    await this.openPhoneModal();
    await this.phoneModal.locator('[name="newPhoneNumber"]').fill(newPhoneNumber);
    await this.phoneModal.locator("#phoneOtp").fill(otp);
    await this.phoneModal.getByRole("button", { name: /xác nhận|xac nhan/i }).click();
  }

  async submitPasswordChange(newPassword: string, confirmPassword: string, otp: string): Promise<void> {
    await this.openPasswordModal();
    await this.passwordModal.locator('[name="newPassword"]').fill(newPassword);
    await this.passwordModal.locator('[name="confirmPassword"]').fill(confirmPassword);
    await this.passwordModal.locator("#passwordOtp").fill(otp);
    await this.passwordModal.getByRole("button", { name: /xác nhận|xac nhan/i }).click();
  }

  async waitForSweetAlert(): Promise<void> {
    await expect(this.toastPopup()).toBeVisible();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlertIfPresent(): Promise<void> {
    const confirmButton = this.page.locator(".swal2-confirm");
    if (await confirmButton.count()) {
      await confirmButton.click();
    }
  }

  async readProfileValues(): Promise<{ username: string; email: string; phone: string }> {
    return {
      username: ((await this.usernameValue.textContent()) ?? "").trim(),
      email: ((await this.emailValue.textContent()) ?? "").trim(),
      phone: ((await this.phoneValue.textContent()) ?? "").trim()
    };
  }

  private modalContainer(modal: "username" | "phone" | "password"): Locator {
    switch (modal) {
      case "username":
        return this.usernameModal;
      case "phone":
        return this.phoneModal;
      case "password":
        return this.passwordModal;
    }
  }

  private infoValueByLabel(label: RegExp): Locator {
    return this.page
      .locator(".info-box")
      .filter({ has: this.page.locator(".info-label", { hasText: label }) })
      .locator(".info-value")
      .first();
  }
}
