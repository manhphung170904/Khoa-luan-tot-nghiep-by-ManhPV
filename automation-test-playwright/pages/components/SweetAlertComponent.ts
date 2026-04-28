import { expect, type Locator, type Page } from "@playwright/test";
import { env } from "@config/env";

export class SweetAlertComponent {
  readonly popup: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly textarea: Locator;

  constructor(private readonly page: Page) {
    this.popup = this.page.locator(".swal2-popup");
    this.confirmButton = this.page.locator(".swal2-confirm");
    this.cancelButton = this.page.locator(".swal2-cancel");
    this.textarea = this.page.locator(".swal2-textarea");
  }

  async expectVisible(): Promise<void> {
    await expect(this.popup).toBeVisible();
  }

  async expectContains(text: string | RegExp): Promise<void> {
    await this.expectVisible();
    await expect(this.popup).toContainText(text);
  }

  async fillTextarea(value: string): Promise<void> {
    await this.textarea.fill(value);
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async confirmIfPresent(): Promise<void> {
    if (await this.confirmButton.count()) {
      await this.confirmButton.click();
    }
  }

  async waitUntilNotProcessing(): Promise<void> {
    await expect(async () => {
      const normalizedText = ((await this.popup.textContent()) ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      expect(normalizedText).not.toMatch(/dang xu ly|vui long doi|processing|please wait/i);
    }).toPass({ timeout: env.expectTimeout });
  }
}
