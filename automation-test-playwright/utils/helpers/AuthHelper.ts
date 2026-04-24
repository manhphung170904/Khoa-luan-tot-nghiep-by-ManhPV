import type { Page } from "@playwright/test";
import { AuthSessionHelper } from "./AuthSessionHelper";

// Lop nay duoc giu lai de tranh vo import cu.
// Toan bo logic dang duoc uy quyen ve AuthSessionHelper.
export class AuthHelper {
  static async loginAs(page: Page, username: string, password?: string): Promise<void> {
    await AuthSessionHelper.loginUi(page, username, password);
  }

  static async loginAsAdmin(page: Page): Promise<void> {
    await AuthSessionHelper.loginAsAdminUi(page);
  }

  static async loginAsStaff(page: Page): Promise<void> {
    await AuthSessionHelper.loginAsStaffUi(page);
  }

  static async loginAsCustomer(page: Page): Promise<void> {
    await AuthSessionHelper.loginAsCustomerUi(page);
  }

  static async loginAsAdminStrict(page: Page): Promise<void> {
    await AuthSessionHelper.loginAsAdminUiStrict(page);
  }

  static async loginAsStaffStrict(page: Page): Promise<void> {
    await AuthSessionHelper.loginAsStaffUiStrict(page);
  }

  static async loginAsCustomerStrict(page: Page): Promise<void> {
    await AuthSessionHelper.loginAsCustomerUiStrict(page);
  }
}
