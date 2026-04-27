import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminStaffListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/staff/list";
  readonly addButton: Locator;
  readonly adminTableBody: Locator;
  readonly staffTableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = this.page.locator(".btn-hd-add, .btn-add");
    this.adminTableBody = this.page.locator("#adminTableBody");
    this.staffTableBody = this.page.locator("#staffTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/staff\/(list|search)/);
    await expect(this.page.locator("#staffTableBody, #adminTableBody")).toBeVisible();
  }

  async openAddForm(): Promise<void> {
    await this.addButton.click();
  }

  rowByStaffName(fullName: string): Locator {
    return this.firstVisible(this.page.locator("tbody tr").filter({ hasText: fullName }));
  }

  async filterByFullName(fullName: string): Promise<void> {
    await this.fillFilter("fullName", fullName);
  }

  async filterByRole(role: "STAFF" | "ADMIN"): Promise<void> {
    await this.selectFilter("role", role);
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/staff/");
  }

  async deleteStaff(text: string): Promise<void> {
    await this.rowByStaffName(text).locator(".btn-delete").click();
  }

  async waitForSearchTableData(): Promise<void> {
    await expect(async () => {
      const hasRows = (await this.page.locator("#staffTableBody tr").count()) > 0;
      const hasEmpty = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmpty).toBeTruthy();
    }).toPass();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }
}
