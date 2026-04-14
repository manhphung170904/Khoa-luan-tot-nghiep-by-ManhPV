import { expect, type Locator, type Page } from "@playwright/test";
import { env } from "@config/env";

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async visit(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: "commit", timeout: env.navigationTimeout });
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

  async confirmSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-confirm").click();
  }

  async cancelSweetAlert(): Promise<void> {
    await this.page.locator(".swal2-cancel").click();
  }
}
