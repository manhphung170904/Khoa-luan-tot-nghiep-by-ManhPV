import { expect, type Locator, type Page } from "@playwright/test";
import { env } from "@config/env";
import { TextNormalizeHelper } from "@helpers/TextNormalizeHelper";

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

  async expectContainsLoose(text: string | RegExp): Promise<void> {
    await this.expectVisible();
    await this.waitUntilNotProcessing();

    await expect(async () => {
      const rawText = ((await this.popup.textContent()) ?? "").trim();
      const normalizedText = TextNormalizeHelper.normalizeLooseText(rawText);

      if (typeof text === "string") {
        expect(rawText.includes(text) || normalizedText.includes(TextNormalizeHelper.normalizeLooseText(text))).toBeTruthy();
        return;
      }

      const normalizedPattern = new RegExp(TextNormalizeHelper.normalizeLooseText(text.source), text.flags.replace("g", ""));
      expect(text.test(rawText) || normalizedPattern.test(normalizedText)).toBeTruthy();
    }).toPass({ timeout: env.expectTimeout });
  }

  async fillTextarea(value: string): Promise<void> {
    await this.textarea.fill(value);
  }

  async confirm(): Promise<void> {
    await this.confirmButton
      .filter({ visible: true })
      .first()
      .or(this.page.getByRole("button", { name: /ok|đồng ý|dong y|xác nhận|xac nhan|confirm|yes/i }))
      .first()
      .click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton
      .filter({ visible: true })
      .first()
      .or(this.page.getByRole("button", { name: /hủy|huy|cancel|no/i }))
      .first()
      .click();
  }

  async confirmIfPresent(): Promise<void> {
    const popupVisible = await this.popup.filter({ visible: true }).count();
    if (!popupVisible) {
      return;
    }

    const button = this.confirmButton
      .filter({ visible: true })
      .first()
      .or(this.page.getByRole("button", { name: /ok|đồng ý|dong y|xác nhận|xac nhan|confirm|yes/i }))
      .first();
    if (await button.count()) {
      await button.click();
      await expect(this.popup).toBeHidden();
    }
  }

  async waitUntilNotProcessing(): Promise<void> {
    await expect(async () => {
      const normalizedText = TextNormalizeHelper.normalizeLooseText((await this.popup.textContent()) ?? "");
      expect(normalizedText).not.toMatch(/dang xu ly|vui long doi|processing|please wait/i);
    }).toPass({ timeout: env.expectTimeout });
  }
}
