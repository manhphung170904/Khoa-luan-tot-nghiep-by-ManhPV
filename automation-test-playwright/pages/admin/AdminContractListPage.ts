import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminContractListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/contract/list";
  readonly addButton: Locator;
  readonly updateStatusesButton: Locator;
  readonly tableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-add");
    this.updateStatusesButton = this.page.locator(".btn-update-status");
    this.tableBody = this.page.locator("#contractTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/contract\/(list|search)/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#contractTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
  }

  async filterByCustomer(customerId: number | string): Promise<void> {
    await this.selectFilter("customerId", String(customerId));
  }

  async filterByBuilding(buildingId: number | string): Promise<void> {
    await this.selectFilter("buildingId", String(buildingId));
  }

  async filterByStaff(staffId: number | string): Promise<void> {
    await this.selectFilter("staffId", String(staffId));
  }

  async filterByStatus(status: "ACTIVE" | "EXPIRED"): Promise<void> {
    await this.selectFilter("status", status);
  }

  async fillRentPriceRange(rentPriceFrom?: number, rentPriceTo?: number): Promise<void> {
    if (typeof rentPriceFrom === "number") {
      await this.fillFilter("rentPriceFrom", String(rentPriceFrom));
    }
    if (typeof rentPriceTo === "number") {
      await this.fillFilter("rentPriceTo", String(rentPriceTo));
    }
  }

  rowByContractText(text: string): Locator {
    return this.firstVisible(this.page.locator("#contractTableBody tr").filter({ hasText: text }));
  }

  async submitFilters(): Promise<void> {
    await this.search();
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/contract/");
  }

  async openEdit(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/contract/edit/");
  }

  async deleteContract(text: string): Promise<void> {
    await this.rowByContractText(text).locator(".btn-delete").click();
  }

  async updateStatuses(): Promise<void> {
    await this.updateStatusesButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
