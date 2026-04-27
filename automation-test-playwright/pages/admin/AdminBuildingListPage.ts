import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminBuildingListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/building/list";
  readonly addButton: Locator;
  readonly tableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-add");
    this.tableBody = this.page.locator("#buildingTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/building\/(list|search)/);
    await expect(this.tableBody).toBeVisible();
  }

  async waitForTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#buildingTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
  }

  async filterByName(name: string): Promise<void> {
    await this.fillFilter("name", name);
  }

  async filterByPropertyType(propertyType: string): Promise<void> {
    await this.selectFilter("propertyType", propertyType);
  }

  async filterByTransactionType(transactionType: string): Promise<void> {
    await this.selectFilter("transactionType", transactionType);
  }

  async filterByDistrict(districtId: string): Promise<void> {
    await this.selectFilter("districtId", districtId);
  }

  async search(): Promise<void> {
    const searchForm = this.page.locator("#searchForm");
    await Promise.all([
      this.page.waitForResponse((response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/v1/admin/buildings") &&
        response.status() === 200
      ),
      searchForm.evaluate((form) => (form as HTMLFormElement).requestSubmit())
    ]);
  }

  rowByBuildingName(name: string): Locator {
    return this.firstVisible(this.page.locator("#buildingTableBody tr").filter({ hasText: name }));
  }

  async openDetail(name: string): Promise<void> {
    await this.clickRowLink(name, "/admin/building/");
  }

  async openEdit(name: string): Promise<void> {
    await this.clickRowLink(name, "/admin/building/edit/");
  }

  async openAdditionalInformation(name: string): Promise<void> {
    await this.clickRowLink(name, "/admin/building-additional-information/");
  }

  async deleteBuilding(name: string): Promise<void> {
    await this.rowByBuildingName(name).locator(".btn-delete").click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }
}
