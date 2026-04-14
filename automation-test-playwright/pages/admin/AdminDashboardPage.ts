import { expect } from "@playwright/test";
import { AdminRoutedPage } from "../core/AdminRoutedPage";

export class AdminDashboardPage extends AdminRoutedPage {
  protected readonly path = "/admin/dashboard";

  async openBuildingsFromStatCard(): Promise<void> {
    await this.page.locator(".stat-card", { hasText: "Bất động sản" }).click();
  }

  async openCustomersFromStatCard(): Promise<void> {
    await this.page.locator(".stat-card", { hasText: "Khách hàng" }).click();
  }

  async openStaffsFromStatCard(): Promise<void> {
    await this.page.locator(".stat-card", { hasText: "Nhân viên" }).click();
  }

  async openContractsFromStatCard(): Promise<void> {
    await this.page.locator(".stat-card", { hasText: "Hợp đồng" }).click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator("h2", { hasText: "Dashboard" })).toBeVisible();
  }
}
