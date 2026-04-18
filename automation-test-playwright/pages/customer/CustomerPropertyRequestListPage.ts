import { expect, type Locator } from "@playwright/test";
import { CustomerShellPage } from "../core/CustomerShellPage";

export class CustomerPropertyRequestListPage extends CustomerShellPage {
  private readonly requestList = this.page.locator("#requestList");

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/property-request\/list/);
    await expect(this.requestList).toBeVisible();
    await expect(this.page.getByRole("heading", { name: /Yêu cầu của tôi/i })).toBeVisible();
  }

  cardByRequestId(id: number): Locator {
    return this.requestList.locator(".request-card").filter({
      has: this.page.locator(".request-id", { hasText: `Yêu cầu #${id}` })
    }).first();
  }

  async expectRequestVisible(id: number): Promise<void> {
    await expect(this.cardByRequestId(id)).toBeVisible();
  }

  async expectRequestContains(id: number, text: string | RegExp): Promise<void> {
    await expect(this.cardByRequestId(id)).toContainText(text);
  }

  async cancelRequest(id: number): Promise<void> {
    await this.cardByRequestId(id).locator(".btn-cancel").click();
  }

  async expectCancelButtonVisible(id: number): Promise<void> {
    await expect(this.cardByRequestId(id).locator(".btn-cancel")).toBeVisible();
  }

  async expectCancelButtonHidden(id: number): Promise<void> {
    await expect(this.cardByRequestId(id).locator(".btn-cancel")).toHaveCount(0);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.requestList).toContainText(/Chưa có yêu cầu nào/i);
  }
}
