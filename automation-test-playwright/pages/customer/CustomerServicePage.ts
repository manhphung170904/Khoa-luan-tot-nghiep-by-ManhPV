import { expect } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";

export class CustomerServicePage extends CustomerRoutedPage {
  protected readonly path = "/customer/service";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Dịch vụ|MoonNest/i);
  }
}
