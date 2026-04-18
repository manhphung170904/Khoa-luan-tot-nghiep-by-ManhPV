import { expect, type Locator, type Page } from "@playwright/test";
import { StaffRoutedPage } from "../core/StaffRoutedPage";

export class StaffDashboardPage extends StaffRoutedPage {
  protected readonly path = "/staff/dashboard";
  readonly overdueInvoicesBody: Locator;
  readonly expiringContractsBody: Locator;
  readonly expiringInvoicesBody: Locator;

  constructor(page: Page) {
    super(page);
    this.overdueInvoicesBody = this.page.locator("#overdueInvoicesBody");
    this.expiringContractsBody = this.page.locator("#expiringContractsBody");
    this.expiringInvoicesBody = this.page.locator("#expiringInvoicesBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/dashboard/);
    await expect(this.page).toHaveTitle(/Bang dieu khien nhan vien|Bảng điều khiển nhân viên|dashboard/i);
    await expect(this.page.locator('a.nav-link.active[href="/staff/dashboard"]')).toBeVisible();
  }

  async expectSummarySectionsVisible(): Promise<void> {
    await expect(this.page.locator("#buildingCntStat")).toBeVisible();
    await expect(this.page.locator("#contractCntStat")).toBeVisible();
    await expect(this.page.locator("#customerCntStat")).toBeVisible();
    await expect(this.page.locator("#unpaidInvoiceCntStat")).toBeVisible();
    await expect(this.overdueInvoicesBody).toBeVisible();
    await expect(this.expiringContractsBody).toBeVisible();
    await expect(this.expiringInvoicesBody).toBeVisible();
  }
}
