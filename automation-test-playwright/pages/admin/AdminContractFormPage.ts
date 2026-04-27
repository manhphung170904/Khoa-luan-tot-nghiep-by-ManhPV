import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminContractFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/admin/contract/add";
  protected readonly editPath = "/admin/contract/edit";
  readonly form: Locator;
  readonly rentAreaSelect: Locator;
  readonly staffSelect: Locator;
  readonly quickAssignModal: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.page.locator("#contractForm");
    this.rentAreaSelect = this.page.locator("#rentAreaSelect, [name='rentArea']");
    this.staffSelect = this.page.locator("#staffSelect, [name='staffId']");
    this.quickAssignModal = this.page.locator("#quickAssignModal");
  }

  async expectAddLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/contract\/add/);
    await expect(this.form).toBeVisible();
  }

  async expectEditLoaded(contractId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/contract/edit/${contractId}$`));
    await expect(this.form).toBeVisible();
  }

  async selectBuilding(buildingId: number | string): Promise<void> {
    await this.firstVisible(this.page.locator("#buildingSelect, [name='buildingId']")).selectOption(String(buildingId));
  }

  async selectCustomer(customerId: number | string): Promise<void> {
    await this.firstVisible(this.page.locator("#customerSelect, [name='customerId']")).selectOption(String(customerId));
  }

  async selectRentArea(rentArea: number | string): Promise<void> {
    await this.firstVisible(this.rentAreaSelect).selectOption(String(rentArea));
  }

  async selectStaff(staffId: number | string): Promise<void> {
    await this.firstVisible(this.staffSelect).selectOption(String(staffId));
  }

  async fillRentPrice(value: number): Promise<void> {
    await this.fillNumberField("rentPrice", value);
  }

  async fillDates(startDate: string, endDate: string): Promise<void> {
    await this.fillTextField("startDate", startDate);
    await this.fillTextField("endDate", endDate);
  }

  async selectStatus(status: "ACTIVE" | "EXPIRED"): Promise<void> {
    await this.selectOption("status", status);
  }

  async waitForRentAreaOptions(): Promise<void> {
    const select = this.firstVisible(this.rentAreaSelect);
    await expect(select).toBeEnabled();
    await expect(async () => {
      const count = await select.locator("option").count();
      expect(count).toBeGreaterThan(1);
    }).toPass();
  }

  async waitForStaffOptions(): Promise<void> {
    const select = this.firstVisible(this.staffSelect);
    await expect(async () => {
      const count = await select.locator("option").count();
      expect(count).toBeGreaterThan(1);
    }).toPass();
  }

  async expectNoCommonStaffOption(): Promise<void> {
    await expect(this.firstVisible(this.staffSelect)).toContainText(/không có nhân viên|khong co nhan vien/i);
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

  async submitContract(): Promise<void> {
    await this.submit();
  }

  async expectDateValidationContains(text: string | RegExp): Promise<void> {
    await expect(this.page.locator("#dateValidation")).toContainText(text);
  }

  async expectExpiredBanner(): Promise<void> {
    await expect(this.page.locator(".expired-banner")).toBeVisible();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await this.expectSweetAlertContainsText(text);
  }
}


