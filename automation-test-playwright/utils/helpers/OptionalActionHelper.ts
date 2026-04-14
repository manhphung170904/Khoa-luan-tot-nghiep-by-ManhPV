import type { Locator } from "@playwright/test";

export class OptionalActionHelper {
  static async clickIfPresent(locator: Locator): Promise<boolean> {
    if (!(await locator.count())) {
      return false;
    }

    await locator.first().click();
    return true;
  }

  static async fillIfPresent(locator: Locator, value: string): Promise<boolean> {
    if (!(await locator.count())) {
      return false;
    }

    await locator.first().fill(value);
    return true;
  }

  static async selectIfPresent(locator: Locator, value: string): Promise<boolean> {
    if (!(await locator.count())) {
      return false;
    }

    await locator.first().selectOption(value);
    return true;
  }
}
