import { type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class StaffShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openDashboard(): Promise<void> {
    await this.visit("/staff/dashboard");
  }

  async goToBuildings(): Promise<void> {
    await this.visit("/staff/buildings");
  }

  async goToCustomers(): Promise<void> {
    await this.visit("/staff/customers");
  }

  async goToContracts(): Promise<void> {
    await this.visit("/staff/contracts");
  }

  async goToInvoices(): Promise<void> {
    await this.visit("/staff/invoices");
  }

  async goToProfile(): Promise<void> {
    await this.visit("/staff/profile");
  }
}
