import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminBuildingDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/building";
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deleteButton = this.page.locator(".btn-hero-delete");
  }

  async expectLoaded(buildingId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/building/${buildingId}$`));
    await expect(this.page.locator("h1, h2")).toBeVisible();
  }

  async deleteBuilding(): Promise<void> {
    await this.deleteButton.click();
  }
}
