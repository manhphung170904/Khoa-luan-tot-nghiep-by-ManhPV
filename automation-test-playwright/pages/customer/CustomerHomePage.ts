import { expect } from "@playwright/test";
import { CustomerRoutedPage } from "../core/CustomerRoutedPage";

export class CustomerHomePage extends CustomerRoutedPage {
  protected readonly path = "/customer/home";

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Trang khách hàng|customer/i);
  }
}
