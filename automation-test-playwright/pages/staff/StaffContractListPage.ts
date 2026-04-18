import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffContractListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/contracts";
  readonly tableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.tableBody = this.page.locator("#contractTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('a.nav-link.active[href="/staff/contracts"]')).toBeVisible();
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#contractTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async filterByCustomer(customerId: number | string): Promise<void> {
    await this.selectFilter("customerId", String(customerId));
  }

  async filterByBuilding(buildingId: number | string): Promise<void> {
    await this.selectFilter("buildingId", String(buildingId));
  }

  async filterByStatus(status: "ACTIVE" | "EXPIRED"): Promise<void> {
    await this.selectFilter("status", status);
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  rowByContractText(text: string): Locator {
    return this.page.locator("#contractTableBody tr").filter({ hasText: text }).first();
  }

  async openContractDetail(text: string): Promise<void> {
    await this.rowByContractText(text).locator(".btn-view").click();
  }

  async expectDetailModalContains(text: string): Promise<void> {
    await expect(this.page.locator(".modal.show")).toContainText(text);
  }
}
