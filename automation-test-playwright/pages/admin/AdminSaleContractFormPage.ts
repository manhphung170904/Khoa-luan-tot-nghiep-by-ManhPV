import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminSaleContractFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/admin/sale-contract/add";
  protected readonly editPath = "/admin/sale-contract/edit";
  readonly form: Locator;
  readonly staffSelect: Locator;
  readonly quickAssignModal: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.page.locator("#saleContractForm, #editForm");
    this.staffSelect = this.page.locator("#staffSelect, [name='staffId']");
    this.quickAssignModal = this.page.locator("#quickAssignModal");
  }

  async expectAddLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/sale-contract\/add/);
    await expect(this.form).toBeVisible();
  }

  async expectEditLoaded(contractId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/sale-contract/edit/${contractId}$`));
    await expect(this.form).toBeVisible();
  }

  async selectBuilding(buildingId: number | string): Promise<void> {
    await this.firstVisible(this.page.locator("#buildingId, [name='buildingId']")).selectOption(String(buildingId));
  }

  async selectCustomer(customerId: number | string): Promise<void> {
    await this.firstVisible(this.page.locator("#customerSelect, [name='customerId']")).selectOption(String(customerId));
  }

  async selectStaff(staffId: number | string): Promise<void> {
    await this.firstVisible(this.staffSelect).selectOption(String(staffId));
  }

  async fillSalePrice(value: number): Promise<void> {
    await this.fillNumberField("salePrice", value);
  }

  async fillTransferDate(date: string): Promise<void> {
    await this.fillTextField("transferDate", date);
  }

  async fillNote(note: string): Promise<void> {
    await this.fillTextField("note", note);
  }

  async waitForStaffOptions(): Promise<void> {
    const select = this.firstVisible(this.staffSelect);
    await expect(async () => {
      const count = await select.locator("option").count();
      expect(count).toBeGreaterThan(1);
    }).toPass();
  }

  async openQuickAssignModal(): Promise<void> {
    await this.page.locator("#btnQuickAssign").click();
    await expect(this.quickAssignModal).toBeVisible();
  }

  async selectQuickAssignStaff(staffId: number | string): Promise<void> {
    await this.page.locator("#allStaffSelect").selectOption(String(staffId));
  }

  async submitQuickAssign(): Promise<void> {
    await this.page.locator("#submitQuickAssign").click();
  }

  async submitSaleContract(): Promise<void> {
    await this.submit();
  }

  async expectTransferDateHintContains(text: string | RegExp): Promise<void> {
    await expect(this.page.locator("#transferDateHint")).toContainText(text);
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}
