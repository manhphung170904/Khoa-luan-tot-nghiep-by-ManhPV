import { expect } from "@playwright/test";
import { StaffRoutedPage } from "../core/StaffRoutedPage";

export class StaffProfilePage extends StaffRoutedPage {
  protected readonly path = "/staff/profile";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Tài Khoản Nhân Viên|Tài khoản/i);
  }
}
