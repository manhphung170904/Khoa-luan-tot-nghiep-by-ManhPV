import { type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

export class AdminBuildingAdditionalInfoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(buildingId: number): Promise<void> {
    await this.visit(`/admin/building-additional-information/${buildingId}`);
  }

  async openSection(title: string): Promise<void> {
    await this.page.getByText(new RegExp(title, "i")).first().click();
  }

  async clickAddButton(): Promise<void> {
    await this.page.getByRole("button", { name: /thêm|add/i }).first().click();
  }
}
