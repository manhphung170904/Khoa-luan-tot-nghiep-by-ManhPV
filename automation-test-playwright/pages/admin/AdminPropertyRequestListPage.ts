import { expect, type Locator, type Page } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminPropertyRequestListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/property-request/list";
  readonly tableBody: Locator;
  private readonly table: TableComponent;

  constructor(page: Page) {
    super(page);
    this.tableBody = this.page.locator("#requestTableBody");
    this.table = new TableComponent(page, "#requestTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/property-request\/list/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await this.table.waitForDataOrEmpty();
  }

  async filterByStatus(status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | ""): Promise<void> {
    await this.page.locator("#statusFilter").selectOption(status);
  }

  rowByRequestId(requestId: number): Locator {
    return this.firstVisible(this.page.locator("#requestTableBody tr").filter({ hasText: `#${requestId}` }));
  }

  async openDetail(requestId: number): Promise<void> {
    await this.rowByRequestId(requestId).locator(`a[href="/admin/property-request/${requestId}"]`).click();
  }
}
