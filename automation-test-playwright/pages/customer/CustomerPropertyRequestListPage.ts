import { expect, type Locator } from "@playwright/test";
import { CustomerShellPage } from "../core/CustomerShellPage";

export class CustomerPropertyRequestListPage extends CustomerShellPage {
  private readonly requestList = this.page.locator("#requestList");

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/customer\/property-request\/list/);
    await expect(this.requestList).toBeVisible();
  }

  cardByRequestId(id: number): Locator {
    return this.firstVisible(
      this.requestList.locator(".request-card").filter({
        has: this.page.locator(".request-id", { hasText: `#${id}` })
      })
    );
  }

  async expectRequestVisible(id: number): Promise<void> {
    await expect(this.cardByRequestId(id)).toBeVisible();
  }

  async expectRequestContains(id: number, text: string | RegExp): Promise<void> {
    const card = this.cardByRequestId(id);
    await expect(card).toBeVisible();
    await expect(async () => {
      const rawText = ((await card.textContent()) ?? "").trim();
      const normalizedText = this.normalizeLooseText(rawText);
      if (typeof text === "string") {
        expect(rawText.includes(text) || normalizedText.includes(this.normalizeLooseText(text))).toBeTruthy();
        return;
      }

      const normalizedPattern = new RegExp(this.normalizeLooseText(text.source), text.flags.replace("g", ""));
      expect(text.test(rawText) || normalizedPattern.test(normalizedText)).toBeTruthy();
    }).toPass();
  }

  async cancelRequest(id: number): Promise<void> {
    await this.cardByRequestId(id).locator(".btn-cancel").click();
  }

  async expectCancelButtonVisible(id: number): Promise<void> {
    await expect(this.cardByRequestId(id).locator(".btn-cancel")).toBeVisible();
  }

  async expectCancelButtonHidden(id: number): Promise<void> {
    const cancelButton = this.cardByRequestId(id).locator(".btn-cancel");
    const count = await cancelButton.count();
    if (count === 0) {
      return;
    }

    await expect(cancelButton.first()).toBeHidden();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.requestList).toContainText(/ChÆ°a cÃ³ yÃªu cáº§u nÃ o/i);
  }
}
