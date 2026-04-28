import { expect, type Locator, type Page } from "@playwright/test";
import { TableComponent } from "../components/TableComponent";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class AdminInvoiceListPage extends RoutedCrudListPage {
  protected readonly path = "/admin/invoice/list";
  readonly addInvoiceButton: Locator;
  readonly updateStatusesButton: Locator;
  readonly invoiceTableBody: Locator;
  private readonly table: TableComponent;

  constructor(page: Page) {
    super(page);
    this.addInvoiceButton = this.page.locator(".btn-hd-primary");
    this.updateStatusesButton = this.page.locator(".btn-hd-green");
    this.invoiceTableBody = this.page.locator("#invoiceTableBody");
    this.table = new TableComponent(page, "#invoiceTableBody");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/invoice\/list/);
    await expect(this.invoiceTableBody).toBeVisible();
  }

  rowByInvoiceId(invoiceId: number): Locator {
    return this.firstVisible(
      this.page
        .locator("#invoiceTableBody tr")
        .filter({ has: this.page.locator(".invoice-id", { hasText: String(invoiceId) }) })
    );
  }

  async waitForTableData(): Promise<void> {
    await expect(this.invoiceTableBody).toBeVisible();
    await this.table.waitForDataOrEmpty();
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
    await this.actionButton(this.rowByInvoiceId(invoiceId), "delete").click();
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
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await super.confirmSweetAlert();
  }
}
