import { expect, type APIResponse, type Locator, type Page } from "@playwright/test";

export class AssertionHelper {
  static async expectOneVisible(locators: Locator[]): Promise<void> {
    await this.expectAtLeastOneVisible(locators);
  }

  static async expectAtLeastOneVisible(locators: Locator[]): Promise<void> {
    for (const locator of locators) {
      const count = await locator.count();
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible()) {
          await expect(candidate).toBeVisible();
          return;
        }
      }
    }

    throw new Error("No locator was visible.");
  }

  static expectStatusIn(response: APIResponse, statuses: number[]): void {
    expect(statuses).toContain(response.status());
  }

  static async expectUrlOneOf(page: Page, patterns: RegExp[]): Promise<void> {
    const url = page.url();
    expect(patterns.some((pattern) => pattern.test(url))).toBeTruthy();
  }

  static async expectTextIfPresent(locator: Locator, text: string): Promise<void> {
    if (await locator.count()) {
      await expect(locator.first()).toContainText(text);
    }
  }

  static async expectBodyContains(page: Page, pattern: RegExp): Promise<void> {
    await expect(page.locator("body")).toContainText(pattern);
  }

  static async expectTableVisible(page: Page, selector = "tbody"): Promise<void> {
    await expect(page.locator(selector)).toBeVisible();
  }

  static async expectFormVisible(page: Page): Promise<void> {
    await expect(page.locator("form:not(#logoutForm)").first()).toBeVisible();
  }
}
