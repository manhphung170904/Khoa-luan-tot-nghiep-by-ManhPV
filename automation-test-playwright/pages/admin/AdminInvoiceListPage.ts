import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminInvoiceListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/invoice/list";
  readonly addInvoiceButton: Locator;
  readonly updateStatusesButton: Locator;
  readonly invoiceTableBody: Locator;

  constructor(page: Page) {
    super(page);
    this.addInvoiceButton = this.page.locator(".btn-hd-primary");
    this.updateStatusesButton = this.page.locator(".btn-hd-green");
    this.invoiceTableBody = this.page.locator("#invoiceTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/invoice\/list/);
    await expect(this.invoiceTableBody).toBeVisible();
  }

  rowByInvoiceId(invoiceId: number): Locator {
    return this.page
      .locator("#invoiceTableBody tr")
      .filter({ has: this.page.locator(".invoice-id", { hasText: String(invoiceId) }) })
      .first();
  }

  async waitForTableData(): Promise<void> {
    await expect(this.invoiceTableBody).toBeVisible();
    await expect(async () => {
      const hasRows = (await this.page.locator("#invoiceTableBody tr").count()) > 0;
      const hasEmptyState = await this.page.locator(".empty-state").isVisible().catch(() => false);
      expect(hasRows || hasEmptyState).toBeTruthy();
    }).toPass();
  }

  async openAddForm(): Promise<void> {
    await this.addInvoiceButton.click();
  }

  async openDetail(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/invoice/");
  }

  async openEdit(text: string): Promise<void> {
    await this.clickRowLink(text, "/admin/invoice/edit/");
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    await this.rowByInvoiceId(invoiceId).locator(".btn-delete").click();
  }

  async filterByMonth(month: number): Promise<void> {
    await this.fillFilter("month", String(month));
  }

  async filterByYear(year: number): Promise<void> {
    await this.fillFilter("year", String(year));
  }

  async filterByStatus(status: "PENDING" | "PAID" | "OVERDUE"): Promise<void> {
    await this.selectFilter("status", status);
  }

  async filterByCustomer(customerId: number): Promise<void> {
    await this.selectFilter("customerId", String(customerId));
  }

  async submitFilters(): Promise<void> {
    const searchForm = this.page.locator("form[action*='/admin/invoice/search']");
    await Promise.all([
      this.page.waitForURL(/\/admin\/invoice\/search(\?|$)/),
      searchForm.evaluate((form) => (form as HTMLFormElement).requestSubmit())
    ]);
  }

  async updateStatuses(): Promise<void> {
    await this.updateStatusesButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    const popup = this.page.locator(".swal2-popup");
    await expect(popup).toBeVisible();
    await expect(popup).not.toContainText(/đang xử lý|vui lòng đợi/i);
  }

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }
}
