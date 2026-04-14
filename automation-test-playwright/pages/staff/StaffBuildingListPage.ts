import { expect } from "@playwright/test";
import { RoutedCrudListPage } from "../core/RoutedCrudListPage";

export class StaffBuildingListPage extends RoutedCrudListPage {
  protected readonly path = "/staff/buildings";

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('a.nav-link.active[href="/staff/buildings"]')).toBeVisible();
    await expect(this.page.locator("h1").first()).toBeVisible();
  }
}
