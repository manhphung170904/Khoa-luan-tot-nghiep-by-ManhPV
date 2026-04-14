import { expect } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";

export class CustomerProfilePage extends CustomerRoutedPage {
  protected readonly path = "/customer/profile";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Tài Khoản|Tài khoản|profile/i);
  }

  async openUsernameModal(): Promise<void> {
    await this.page.getByRole("button", { name: /đổi tên đăng nhập/i }).click();
  }

  async openPhoneModal(): Promise<void> {
    await this.page.getByRole("button", { name: /đổi số điện thoại/i }).click();
  }

  async openPasswordModal(): Promise<void> {
    await this.page.getByRole("button", { name: /đổi mật khẩu/i }).click();
  }

  async openGoogleLink(): Promise<void> {
    await this.page.getByRole("link", { name: /liên kết google/i }).click();
  }

  async updateUsername(newUsername: string, otp: string): Promise<void> {
    await this.openUsernameModal();
    await this.page.locator('#editUsernameModal [name="newUsername"]').fill(newUsername);
    await this.page.locator("#usernameOtp").fill(otp);
    await this.page.locator("#editUsernameModal").getByRole("button", { name: /xác nhận/i }).click();
  }
}
