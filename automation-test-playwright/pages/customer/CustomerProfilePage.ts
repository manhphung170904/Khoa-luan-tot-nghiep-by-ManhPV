import { type Page } from "@playwright/test";
import { ProfilePageBase } from "../core/ProfilePageBase";

export class CustomerProfilePage extends ProfilePageBase {
  constructor(page: Page) {
    super(page, "/customer/profile", /tài khoản|tai khoan|profile/i, ".info-item");
  }

  async openGoogleLink(): Promise<void> {
    await this.page.getByRole("link", { name: /liên kết google|lien ket google/i }).click();
  }
}
