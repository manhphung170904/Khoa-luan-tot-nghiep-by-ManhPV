import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";
import { OptionalActionHelper } from "@helpers/OptionalActionHelper";

export class CrudFormPage extends BasePage {
  readonly form: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.form = page.locator("form").first();
    this.submitButton = page.getByRole("button", { name: /xác nhận|lưu|thêm|cập nhật|submit/i }).last();
    this.cancelButton = page.getByRole("button", { name: /hủy|cancel/i }).last();
  }

  async fillTextField(fieldName: string, value: string): Promise<void> {
    await this.inputByName(fieldName).fill(value);
  }

  async fillNumberField(fieldName: string, value: number): Promise<void> {
    await this.inputByName(fieldName).fill(String(value));
  }

  async selectOption(fieldName: string, value: string): Promise<void> {
    await this.inputByName(fieldName).selectOption(value);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async submitIfPresent(): Promise<boolean> {
    return OptionalActionHelper.clickIfPresent(this.submitButton);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
