import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminPropertyRequestListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/property-request/list";
  readonly tableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.tableBody = this.page.locator("#requestTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/property-request\/list/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#requestTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async filterByStatus(status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | ""): Promise<void> {
    await this.page.locator("#statusFilter").selectOption(status);
  }

  rowByRequestId(requestId: number): Locator {
    return this.page.locator("#requestTableBody tr").filter({ hasText: `#${requestId}` }).first();
  }

  async openDetail(requestId: number): Promise<void> {
    await this.rowByRequestId(requestId).locator(`a[href="/admin/property-request/${requestId}"]`).click();
  }
}
