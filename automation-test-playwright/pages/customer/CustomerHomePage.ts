import { expect, type Locator, type Page } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";

export class CustomerHomePage extends CustomerRoutedPage {
  protected readonly path = "/customer/home";
  readonly welcomeSection: Locator;
  readonly contractsContainer: Locator;
  readonly pendingInvoiceContainer: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeSection = this.page.locator(".welcome-section");
    this.contractsContainer = this.page.locator("#contractsContainer");
    this.pendingInvoiceContainer = this.page.locator("#pendingInvoiceContainer");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/home/);
    await expect(this.page).toHaveTitle(/Trang khách hàng|Trang khach hang|customer/i);
    await expect(this.welcomeSection).toBeVisible();
  }

  async expectDashboardSectionsVisible(): Promise<void> {
    await expect(this.contractsContainer).toBeVisible();
    await expect(this.pendingInvoiceContainer).toBeVisible();
  }

  async openContracts(): Promise<void> {
    await this.firstVisible(this.page.locator('.view-all[href="/customer/contract/list"], .nav-link[href="/customer/contract/list"]')).click();
  }

  async openBuildings(): Promise<void> {
    await this.firstVisible(this.page.locator('.nav-link[href="/customer/building/list"]')).click();
  }

  async openProfile(): Promise<void> {
    await this.firstVisible(this.page.locator('a[href="/customer/profile"]')).click();
  }
}
