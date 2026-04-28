import type { Page } from "@playwright/test";

export class BrowserStorageHelper {
  static localStorageValue(page: Page, key: string): Promise<string | null> {
    return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
  }
}
