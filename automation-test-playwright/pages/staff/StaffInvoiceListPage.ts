import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffInvoiceListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/invoices";
  readonly addInvoiceButton: Locator;
  readonly invoiceTableBody: Locator;
  readonly addInvoiceModal: Locator;
  readonly addInvoiceForm: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.addInvoiceButton = this.page.locator(".btn-add-invoice");
    this.invoiceTableBody = this.page.locator("#invoiceTableBody");
    this.addInvoiceModal = this.page.locator("#addInvoiceModal");
    this.addInvoiceForm = this.page.locator("#addInvoiceForm");
    this.emptyState = this.page.locator(".empty-state");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/staff\/invoices/);
    await expect(this.page.locator('a.nav-link.active[href="/staff/invoices"]')).toBeVisible();
    await expect(this.page.locator("h1").first()).toBeVisible();
    await expect(this.invoiceTableBody).toBeVisible();
  }

  rowByInvoiceId(invoiceId: number): Locator {
    return this.page.locator("#invoiceTableBody tr").filter({ hasText: String(invoiceId) }).first();
  }

  visibleModal(): Locator {
    return this.page.locator(".modal.show");
  }

  async waitForTableData(): Promise<void> {
    await expect(this.invoiceTableBody).toBeVisible();
    await expect(async () => {
      const rows = await this.page.locator("#invoiceTableBody tr").count();
      const emptyVisible = await this.emptyState.isVisible().catch(() => false);
      expect(rows > 0 || emptyVisible).toBeTruthy();
    }).toPass();
  }

  async openAddInvoiceModal(): Promise<void> {
    if (!(await this.addInvoiceModal.isVisible().catch(() => false))) {
      await this.addInvoiceButton.click();
    }
    await expect(this.addInvoiceModal).toBeVisible();
  }

  async selectAddCustomer(customerId: number): Promise<void> {
    await this.addInvoiceForm.locator("#addCustomerSelect").selectOption(String(customerId));
  }

  async selectAddContract(contractId: number): Promise<void> {
    await this.addInvoiceForm.locator("#addContractSelect").selectOption(String(contractId));
  }

  async fillAddInvoiceForm(input: {
    month: number;
    year: number;
    dueDate: string;
    electricityUsage: number;
    waterUsage: number;
  }): Promise<void> {
    await this.addInvoiceForm.locator('[name="month"]').selectOption(String(input.month));
    await this.addInvoiceForm.locator('[name="year"]').fill(String(input.year));
    await this.addInvoiceForm.locator('[name="dueDate"]').fill(input.dueDate);
    await this.addInvoiceForm.locator('[name="electricityUsage"]').fill(String(input.electricityUsage));
    await this.addInvoiceForm.locator('[name="waterUsage"]').fill(String(input.waterUsage));
  }

  async chooseAddStatus(status: "PENDING" | "PAID" | "OVERDUE"): Promise<void> {
    const statusMap = {
      PENDING: "label[for='addStatusPending']",
      PAID: "label[for='addStatusPaid']",
      OVERDUE: "label[for='addStatusOverdue']"
    } as const;
    await this.addInvoiceModal.locator(statusMap[status]).click();
  }

  async submitAddInvoice(): Promise<void> {
    await this.addInvoiceModal.locator('button[form="addInvoiceForm"]').click();
  }

  async openViewModal(invoiceId: number): Promise<void> {
    await this.rowByInvoiceId(invoiceId).locator(".btn-view").click();
    await expect(this.visibleModal()).toBeVisible();
  }

  async openEditModal(invoiceId: number): Promise<void> {
    await this.rowByInvoiceId(invoiceId).locator(".btn-edit").click();
    await expect(this.visibleModal()).toBeVisible();
  }

  async fillVisibleEditForm(input: {
    dueDate: string;
    electricityUsage: number;
    waterUsage: number;
    status: "PENDING" | "PAID" | "OVERDUE";
  }): Promise<void> {
    const modal = this.visibleModal();
    await modal.locator('[name="dueDate"]').fill(input.dueDate);
    await modal.locator('[name="electricityUsage"]').fill(String(input.electricityUsage));
    await modal.locator('[name="waterUsage"]').fill(String(input.waterUsage));

    const statusIdMap = {
      PENDING: "statusPending",
      PAID: "statusPaid",
      OVERDUE: "statusOverdue"
    } as const;
    await modal.locator(`label[for^="${statusIdMap[input.status]}-"]`).first().click();
  }

  async saveVisibleEditForm(): Promise<void> {
    await this.visibleModal().getByRole("button", { name: /lưu thay đổi/i }).click();
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    await this.rowByInvoiceId(invoiceId).locator(".btn-delete").click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }
}
