import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CustomerShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openHome(): Promise<void> {
    await this.visit("/customer/home");
  }

  async goToContracts(): Promise<void> {
    await this.visit("/customer/contract/list");
  }

  async goToInvoices(): Promise<void> {
    await this.visit("/customer/invoice/list");
  }

  async goToBuildings(): Promise<void> {
    await this.visit("/customer/building/list");
  }

  async goToTransactions(): Promise<void> {
    await this.visit("/customer/transaction/history");
  }

  async goToServices(): Promise<void> {
    await this.visit("/customer/service");
  }

  async goToProfile(): Promise<void> {
    await this.visit("/customer/profile");
  }
}
