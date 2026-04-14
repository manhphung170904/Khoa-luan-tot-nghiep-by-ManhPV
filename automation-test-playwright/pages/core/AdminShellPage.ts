import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goToBuildings(): Promise<void> {
    await this.linkByHref("/admin/building/list").click();
  }

  async goToCustomers(): Promise<void> {
    await this.linkByHref("/admin/customer/list").click();
  }

  async goToContracts(): Promise<void> {
    await this.linkByHref("/admin/contract/list").click();
  }

  async goToSaleContracts(): Promise<void> {
    await this.linkByHref("/admin/sale-contract/list").click();
  }

  async goToInvoices(): Promise<void> {
    await this.linkByHref("/admin/invoice/list").click();
  }

  async goToReports(): Promise<void> {
    await this.linkByHref("/admin/report").click();
  }

  async goToStaffs(): Promise<void> {
    await this.linkByHref("/admin/staff/list").click();
  }

  async goToProfile(): Promise<void> {
    await this.linkByHref("/admin/profile").click();
  }
}
