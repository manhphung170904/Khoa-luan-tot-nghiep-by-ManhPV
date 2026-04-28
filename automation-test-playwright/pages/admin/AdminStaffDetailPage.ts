import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminStaffDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/staff";
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deleteButton = this.page.locator(".btn-hd-delete");
  }

  async expectLoaded(staffId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/staff/${staffId}$`));
    await expect(this.firstVisible(this.page.locator(".role-badge"))).toBeVisible();
  }

  async deleteStaff(): Promise<void> {
    await this.deleteButton.click();
  }

  async openBuildingAssignments(): Promise<void> {
    await this.page.locator("#btnEditBuildings").click();
    await expect(this.page.locator("#modalBuildings")).toBeVisible();
  }

  async openCustomerAssignments(): Promise<void> {
    await this.page.locator("#btnEditCustomers").click();
    await expect(this.page.locator("#modalCustomers")).toBeVisible();
  }

  async setBuildingAssignment(buildingId: number, checked: boolean): Promise<void> {
    const checkbox = this.page.locator(`#buildingCheckList input[name="buildingIds"][value="${buildingId}"]`);
    if (checked) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async setCustomerAssignment(customerId: number, checked: boolean): Promise<void> {
    const checkbox = this.page.locator(`#customerCheckList input[name="customerIds"][value="${customerId}"]`);
    if (checked) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async saveBuildingAssignments(): Promise<void> {
    await this.page.locator("#saveBuildingsBtn").click();
  }

  async saveCustomerAssignments(): Promise<void> {
    await this.page.locator("#saveCustomersBtn").click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await super.confirmSweetAlert();
  }
}
