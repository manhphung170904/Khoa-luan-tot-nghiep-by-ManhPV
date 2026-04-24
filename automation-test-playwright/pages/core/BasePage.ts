import { expect, type Locator, type Page } from "@playwright/test";
import { env } from "@config/env";

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async visit(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: "domcontentloaded", timeout: env.navigationTimeout });
  }

  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  anyLocator(...selectors: string[]): Locator {
    return this.page.locator(selectors.join(", "));
  }

  testId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  inputByName(name: string): Locator {
    return this.page.locator(`[name="${name}"]`);
  }

  inputById(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  buttonByText(text: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(text, "i") });
  }

  linkByText(text: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(text, "i") });
  }

  linkByHref(href: string): Locator {
    return this.page.locator(`a[href="${href}"]`);
  }

  modalById(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  toastPopup(): Locator {
    return this.page.locator(".swal2-popup");
  }

  protected normalizeLooseText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  async expectPath(pathPattern: RegExp | string): Promise<void> {
    if (typeof pathPattern === "string") {
      await expect(this.page).toHaveURL(new RegExp(pathPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return;
    }

    await expect(this.page).toHaveURL(pathPattern);
  }

  async expectToastMessage(text: string): Promise<void> {
    await expect(this.toastPopup()).toContainText(text);
  }

  async expectSweetAlertContainsText(text: string | RegExp): Promise<void> {
    await expect(async () => {
      const popup = this.toastPopup();
      await expect(popup).toBeVisible();
      await expect(popup).not.toContainText(/đang xử lý|dang xu ly|vui lòng đợi|vui long doi|processing|please wait/i);

      const rawText = ((await popup.textContent()) ?? "").trim();
      const normalizedText = this.normalizeLooseText(rawText);
      if (typeof text === "string") {
        expect(rawText.includes(text) || normalizedText.includes(this.normalizeLooseText(text))).toBeTruthy();
        return;
      }

      const normalizedPattern = new RegExp(this.normalizeLooseText(text.source), text.flags.replace("g", ""));
      expect(text.test(rawText) || normalizedPattern.test(normalizedText)).toBeTruthy();
    }).toPass({ timeout: env.expectTimeout });
  }

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }

  async cancelSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-cancel").click();
  }

  async dismissSweetAlertIfPresent(): Promise<void> {
    const popup = this.page.locator(".swal2-popup.swal2-show");
    if (!(await popup.count())) {
      return;
    }

    const confirmButton = this.page.locator(".swal2-confirm");
    if (await confirmButton.count()) {
      await confirmButton.click();
      await expect(popup).toBeHidden();
    }
  }
}
