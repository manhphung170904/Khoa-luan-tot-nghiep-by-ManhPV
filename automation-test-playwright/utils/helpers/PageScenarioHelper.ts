import type { Page } from "@playwright/test";
import { AssertionHelper } from "./AssertionHelper";
import { AuthSessionHelper, type UserRole } from "./AuthSessionHelper";

export interface OpenablePage {
  open(): Promise<void>;
}

export class PageScenarioHelper {
  static async loginAs(page: Page, role: UserRole): Promise<void> {
    await AuthSessionHelper.loginAsRoleUi(page, role);
  }

  static async loginAndOpen(page: Page, role: UserRole, targetPage: OpenablePage): Promise<void> {
    await this.loginAs(page, role);
    await targetPage.open();
  }

  static async loginAndExpectTable(
    page: Page,
    role: UserRole,
    targetPage: OpenablePage,
    selector = "tbody"
  ): Promise<void> {
    await this.loginAndOpen(page, role, targetPage);
    await AssertionHelper.expectTableVisible(page, selector);
  }

  static async loginAndExpectBody(page: Page, role: UserRole, targetPage: OpenablePage, pattern: RegExp): Promise<void> {
    await this.loginAndOpen(page, role, targetPage);
    await AssertionHelper.expectBodyContains(page, pattern);
  }

  static async loginAndExpectForm(page: Page, role: UserRole, openForm: () => Promise<void>): Promise<void> {
    await this.loginAs(page, role);
    await openForm();
    await AssertionHelper.expectFormVisible(page);
  }
}
