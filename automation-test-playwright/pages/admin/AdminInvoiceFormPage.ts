import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminInvoiceFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/admin/invoice/add";
  protected readonly editPath = "/admin/invoice/edit";
  readonly customerSelect: Locator;
  readonly contractSelect: Locator;
  readonly totalAmount: Locator;
  readonly warningBox: Locator;

  constructor(page: Page) {
    super(page);
    this.customerSelect = this.page.locator("#customerSelect, [name='customerId']");
    this.contractSelect = this.page.locator("#contractSelect, [name='contractId']");
    this.totalAmount = this.page.locator("#totalAmount");
    this.warningBox = this.page.locator("#notPendingWarning");
  }

  async expectAddLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/invoice\/add/);
    await expect(this.page.locator("#invoiceForm")).toBeVisible();
  }

  async expectEditLoaded(invoiceId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/invoice/edit/${invoiceId}$`));
    await expect(this.page.locator("#invoiceEditForm")).toBeVisible();
  }

  async selectCustomer(customerId: number): Promise<void> {
    await this.customerSelect.selectOption(String(customerId));
  }

  async selectContract(contractId: number): Promise<void> {
    await this.contractSelect.selectOption(String(contractId));
  }

  async fillAddForm(input: {
    customerId: number;
    contractId: number;
    month: number;
    year: number;
    dueDate: string;
    electricityUsage: number;
    waterUsage: number;
  }): Promise<void> {
    await this.selectCustomer(input.customerId);
    await this.selectContract(input.contractId);
    await this.page.locator('[name="month"]').selectOption(String(input.month));
    await this.page.locator('[name="year"]').fill(String(input.year));
    await this.page.locator('[name="dueDate"]').fill(input.dueDate);
    await this.page.locator('[name="electricityUsage"]').fill(String(input.electricityUsage));
    await this.page.locator('[name="waterUsage"]').fill(String(input.waterUsage));
  }

  async fillEditForm(input: {
    dueDate: string;
    electricityUsage: number;
    waterUsage: number;
  }): Promise<void> {
    await this.page.locator('[name="dueDate"]').fill(input.dueDate);
    await this.page.locator('[name="electricityUsage"]').fill(String(input.electricityUsage));
    await this.page.locator('[name="waterUsage"]').fill(String(input.waterUsage));
  }

  async readTotalAmountText(): Promise<string> {
    return (await this.totalAmount.innerText()).trim();
  }

  async expectWarningVisible(): Promise<void> {
    await expect(this.warningBox).toBeVisible();
  }

  async submitInvoice(): Promise<void> {
    await this.submitButton.click();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
