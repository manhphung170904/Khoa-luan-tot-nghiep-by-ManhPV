import { expect, type Locator, type Page } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";

export class CustomerServicePage extends CustomerRoutedPage {
  protected readonly path = "/customer/service";
  readonly categories: Locator;

  constructor(page: Page) {
    super(page);
    this.categories = this.page.locator(".category-section");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/service/);
    await expect(this.page).toHaveTitle(/Dich vu|Dịch vụ|MoonNest/i);
    await expect(this.categories).toHaveCount(2);
  }

  cardByTitle(title: string): Locator {
    return this.firstVisible(this.page.locator(".service-card").filter({ hasText: title }));
  }

  async expectCardVisible(title: string): Promise<void> {
    await expect(this.cardByTitle(title)).toBeVisible();
  }

  async expectRequestDisabled(title: string): Promise<void> {
    await expect(this.cardByTitle(title).locator(".btn-request")).toBeDisabled();
  }
}
