import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";

export class AdminPropertyRequestDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/property-request";
  readonly rejectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.rejectButton = this.page.locator(".btn-reject");
  }

  async expectLoaded(requestId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/property-request/${requestId}$`));
    await expect(this.page.locator("h2")).toContainText(`#${requestId}`);
  }

  async expectPendingActionsVisible(): Promise<void> {
    await expect(this.page.locator(".btn-reject")).toBeVisible();
    await expect(this.page.locator(".btn-approve")).toBeVisible();
  }

  async rejectRequest(reason: string): Promise<void> {
    await this.rejectButton.click();
    await this.page.locator(".swal2-textarea").fill(reason);
    await this.page.locator(".swal2-confirm").click();
  }

  async expectCreateContractLink(requestId: number): Promise<void> {
    await expect(this.page.locator(`a[href="/admin/contract/add?fromRequestId=${requestId}"]`)).toBeVisible();
  }

  async expectCreateSaleContractLink(requestId: number): Promise<void> {
    await expect(this.page.locator(`a[href="/admin/sale-contract/add?fromRequestId=${requestId}"]`)).toBeVisible();
  }

  async openCreateContractLink(requestId: number): Promise<void> {
    await this.page.locator(`a[href="/admin/contract/add?fromRequestId=${requestId}"]`).click();
  }

  async openCreateSaleContractLink(requestId: number): Promise<void> {
    await this.page.locator(`a[href="/admin/sale-contract/add?fromRequestId=${requestId}"]`).click();
  }

  async expectProcessedContractLink(contractId: number): Promise<void> {
    await expect(this.page.locator(`a[href="/admin/contract/${contractId}"]`)).toBeVisible();
  }

  async expectProcessedSaleContractLink(contractId: number): Promise<void> {
    await expect(this.page.locator(`a[href="/admin/sale-contract/${contractId}"]`)).toBeVisible();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    const visiblePopup = this.page.locator(".swal2-popup.swal2-show");
    await expect(visiblePopup).toBeVisible();
    const popupText = (
      await visiblePopup.locator("#swal2-title, .swal2-title, #swal2-html-container, .swal2-html-container").allTextContents()
    ).join(" ");
    const normalize = (value: string): string =>
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const rawText = popupText.trim();
    const normalizedText = normalize(popupText);

    if (typeof text === "string") {
      expect(rawText.includes(text) || normalizedText.includes(normalize(text))).toBeTruthy();
      return;
    }

    const normalizedPattern = new RegExp(normalize(text.source), text.flags.replace("g", ""));
    expect(text.test(rawText) || normalizedPattern.test(normalizedText)).toBeTruthy();
  }
}
