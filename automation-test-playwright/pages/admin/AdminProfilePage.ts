import { expect } from "@playwright/test";
import { AdminRoutedPage } from "../core/AdminRoutedPage";

export class AdminProfilePage extends AdminRoutedPage {
  protected readonly path = "/admin/profile";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Thông tin cá nhân|profile/i);
  }

  async openUsernameModal(): Promise<void> {
    await this.page.getByRole("button", { name: /tên đăng nhập/i }).click();
  }

  async openEmailModal(): Promise<void> {
    await this.page.getByRole("button", { name: /email/i }).click();
  }

  async openPhoneModal(): Promise<void> {
    await this.page.getByRole("button", { name: /số điện thoại/i }).click();
  }

  async openPasswordModal(): Promise<void> {
    await this.page.getByRole("button", { name: /mật khẩu/i }).click();
  }
}
