import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudDetailPage } from "../core/RoutedCrudDetailPage";
import { SweetAlertComponent } from "../components/SweetAlertComponent";

export class AdminPropertyRequestDetailPage extends RoutedCrudDetailPage {
  protected readonly detailPath = "/admin/property-request";
  readonly rejectButton: Locator;
  private readonly sweetAlert: SweetAlertComponent;

  constructor(page: Page) {
    super(page);
    this.rejectButton = this.page.locator(".btn-reject");
    this.sweetAlert = new SweetAlertComponent(page);
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
    await this.sweetAlert.fillTextarea(reason);
    await this.sweetAlert.confirm();
  }

  async expectRejectAlertVisible(): Promise<void> {
    await this.sweetAlert.expectVisible();
  }

  async expectPrefilledCustomer(customerId: number): Promise<void> {
    await expect(this.page.locator("[name='customerId_disabled']")).toHaveCount(1);
    await expect(this.page.locator("[name='customerId']")).toHaveValue(String(customerId));
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
    await this.expectSweetAlertContainsText(text);
  }
}
