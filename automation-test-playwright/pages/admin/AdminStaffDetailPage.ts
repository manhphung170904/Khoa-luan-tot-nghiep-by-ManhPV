import { expect } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminStaffDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/staff";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Chi tiết Nhân viên|Nhân viên|staff/i);
  }
}
