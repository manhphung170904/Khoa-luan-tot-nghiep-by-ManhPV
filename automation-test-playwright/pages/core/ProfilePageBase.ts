import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";
import { ProfileModalComponent, type ProfileModalKind } from "../components/ProfileModalComponent";
import { SweetAlertComponent } from "../components/SweetAlertComponent";

type ProfileInfoContainer = ".info-box" | ".info-item";

export abstract class ProfilePageBase extends BasePage {
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
  protected readonly profileModals: ProfileModalComponent;
  protected readonly sweetAlert: SweetAlertComponent;

  protected constructor(
    page: Page,
    private readonly profilePath: string,
    private readonly titlePattern: RegExp,
    private readonly infoContainer: ProfileInfoContainer
  ) {
    super(page);
    this.profileModals = new ProfileModalComponent(page);
    this.sweetAlert = new SweetAlertComponent(page);
    this.usernameValue = this.infoValueByLabel(/đăng nhập|dang nhap/i);
    this.emailValue = this.infoValueByLabel(/Email/i);
    this.linkedGoogleEmailValue = this.infoValueByLabel(/Email Google|Google/i);
    this.phoneValue = this.infoValueByLabel(/điện thoại|dien thoai/i);
    this.usernameModal = this.profileModals.modal("username");
    this.phoneModal = this.profileModals.modal("phone");
    this.passwordModal = this.profileModals.modal("password");
    this.usernameAction = this.profileModals.action("username");
    this.phoneAction = this.profileModals.action("phone");
    this.passwordAction = this.profileModals.action("password");
  }

  async open(): Promise<void> {
    await this.visit(this.profilePath);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(this.titlePattern);
    await expect(this.usernameValue).toBeVisible();
    await expect(this.emailValue).toBeVisible();
    await expect(this.phoneValue).toBeVisible();
  }

  async openUsernameModal(): Promise<void> {
    await this.openProfileModal("username");
  }

  async openPhoneModal(): Promise<void> {
    await this.openProfileModal("phone");
  }

  async openPasswordModal(): Promise<void> {
    await this.openProfileModal("password");
  }

  async sendOtpFromModal(modal: ProfileModalKind): Promise<void> {
    await this.profileModals.sendOtp(modal);
  }

  async submitUsernameChange(newUsername: string, otp: string): Promise<void> {
    const modal = await this.profileModals.open("username");
    await modal.locator('[name="newUsername"]').fill(newUsername);
    await modal.locator("#usernameOtp").fill(otp);
    await modal.getByRole("button", { name: /xác nhận|xac nhan/i }).click();
  }

  async submitPhoneChange(newPhoneNumber: string, otp: string): Promise<void> {
    const modal = await this.profileModals.open("phone");
    await modal.locator('[name="newPhoneNumber"]').fill(newPhoneNumber);
    await modal.locator("#phoneOtp").fill(otp);
    await modal.getByRole("button", { name: /xác nhận|xac nhan/i }).click();
  }

  async submitPasswordChange(newPassword: string, confirmPassword: string, otp: string): Promise<void> {
    const modal = await this.profileModals.open("password");
    await modal.locator('[name="newPassword"]').fill(newPassword);
    await modal.locator('[name="confirmPassword"]').fill(confirmPassword);
    await modal.locator("#passwordOtp").fill(otp);
    await modal.getByRole("button", { name: /xác nhận|xac nhan/i }).click();
  }

  async waitForSweetAlert(): Promise<void> {
    await this.sweetAlert.expectVisible();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlertIfPresent(): Promise<void> {
    await this.sweetAlert.confirmIfPresent();
  }

  async readProfileValues(): Promise<{ username: string; email: string; phone: string }> {
    return {
      username: ((await this.usernameValue.textContent()) ?? "").trim(),
      email: ((await this.emailValue.textContent()) ?? "").trim(),
      phone: ((await this.phoneValue.textContent()) ?? "").trim()
    };
  }

  private async openProfileModal(modal: ProfileModalKind): Promise<void> {
    await this.profileModals.open(modal);
  }

  private infoValueByLabel(label: RegExp): Locator {
    return this.firstVisible(
      this.page
        .locator(this.infoContainer)
        .filter({ has: this.page.locator(".info-label", { hasText: label }) })
        .locator(".info-value")
    );
  }
}
