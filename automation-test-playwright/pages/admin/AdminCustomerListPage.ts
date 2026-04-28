import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminCustomerListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/customer/list";
  readonly addButton: Locator;
  readonly tableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-add");
    this.tableBody = this.page.locator("#customerTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/customer\/(list|search)/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#customerTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
  }

  rowByCustomerName(name: string): Locator {
    return this.firstVisible(this.page.locator("#customerTableBody tr").filter({ hasText: name }));
  }

  async filterByFullName(fullName: string): Promise<void> {
    await this.fillFilter("fullName", fullName);
  }

  async openDetail(customerText: string): Promise<void> {
    await this.clickRowLink(customerText, "/admin/customer/");
  }

  async deleteCustomer(customerText: string): Promise<void> {
    await this.actionButton(this.rowByCustomerName(customerText), "delete").click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await super.confirmSweetAlert();
  }
}
