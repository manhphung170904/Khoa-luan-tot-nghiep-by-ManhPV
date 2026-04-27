import type { Locator } from "@playwright/test";

export class OptionalActionHelper {
  static async clickIfPresent(locator: Locator): Promise<boolean> {
    const target = locator.filter({ visible: true });
    if (!(await target.count())) {
      return false;
    }

    await target.nth(0).click();
    return true;
  }

  static async fillIfPresent(locator: Locator, value: string): Promise<boolean> {
    const target = locator.filter({ visible: true });
    if (!(await target.count())) {
      return false;
    }

    await target.nth(0).fill(value);
    return true;
  }

  static async selectIfPresent(locator: Locator, value: string): Promise<boolean> {
    const target = locator.filter({ visible: true });
    if (!(await target.count())) {
      return false;
    }

    await target.nth(0).selectOption(value);
    return true;
  }
}
