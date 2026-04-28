import { expect, type Locator, type Page } from "@playwright/test";

export class BootstrapModalComponent {
  readonly modal: Locator;

  constructor(private readonly page: Page, selector = ".modal.show") {
    this.modal = this.page.locator(selector);
  }

  byId(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  visible(): Locator {
    return this.page.locator(".modal.show");
  }

  async expectVisible(locator: Locator = this.modal): Promise<void> {
    await expect(locator).toBeVisible();
  }

  async expectHidden(locator: Locator = this.modal): Promise<void> {
    await expect(locator).toBeHidden();
  }

  async close(locator: Locator = this.modal): Promise<void> {
    await locator.locator(".modal-header .btn-close, .modal-footer button, [data-bs-dismiss='modal']").filter({ visible: true }).first().click();
    await this.expectHidden(locator);
  }

  async text(locator: Locator = this.modal): Promise<string> {
    return ((await locator.innerText()) ?? "").trim();
  }
}
