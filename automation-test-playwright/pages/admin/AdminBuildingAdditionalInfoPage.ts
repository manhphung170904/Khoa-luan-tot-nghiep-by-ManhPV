import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../core/BasePage";

type LegalAuthorityForm = {
  authorityName: string;
  authorityType: string;
  phone: string;
  email: string;
  address: string;
  note?: string;
};

type AmenityForm = {
  name: string;
  amenityType: string;
  address: string;
  latitude: string;
  longitude: string;
  distanceMeter?: string;
};

type PlanningMapForm = {
  mapType: string;
  issuedBy: string;
  issuedDate: string;
  expiredDate: string;
  note?: string;
  existingImageUrl: string;
};

type SupplierForm = {
  name: string;
  serviceType: string;
  phone: string;
  email: string;
  address?: string;
  note?: string;
};

export class AdminBuildingAdditionalInfoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(buildingId: number): Promise<void> {
    await this.visit(`/admin/building-additional-information/${buildingId}`);
  }

  async expectLoaded(buildingName?: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/building-additional-information\/\d+/);
    await expect(this.page.locator("#cnt-legal")).toBeVisible();
    await expect(this.page.locator("#cnt-amenity")).toBeVisible();
    await expect(this.page.locator("#cnt-planning")).toBeVisible();
    await expect(this.page.locator("#cnt-supplier")).toBeVisible();
    if (buildingName) {
      await expect(this.page.locator(".building-name-badge")).toContainText(buildingName);
    }
  }

  async expectAllSectionsVisible(): Promise<void> {
    await expect(this.page.locator("#section-legal")).toBeVisible();
    await expect(this.page.locator("#section-amenity")).toBeVisible();
    await expect(this.page.locator("#section-planning")).toBeVisible();
    await expect(this.page.locator("#section-supplier")).toBeVisible();
  }

  async expectCounterValue(type: "legal" | "amenity" | "planning" | "supplier", count: number): Promise<void> {
    await expect(this.page.locator(`#cnt-${type}`)).toHaveText(String(count));
  }

  private section(type: "legal" | "amenity" | "planning" | "supplier"): Locator {
    return this.page.locator(`#section-${type}`);
  }

  private modal(type: "legal" | "amenity" | "planning" | "supplier"): Locator {
    const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
    return this.page.locator(`#modal${capitalized}`);
  }

  private rowByName(type: "legal" | "amenity" | "planning" | "supplier", name: string): Locator {
    return this.firstVisible(this.section(type).locator("tbody tr").filter({ hasText: name }));
  }

  async openCreateModal(type: "legal" | "amenity" | "planning" | "supplier"): Promise<void> {
    await this.section(type).getByRole("button", { name: /Thêm mới|add/i }).click();
    await expect(this.modal(type)).toBeVisible();
  }

  async closeModal(type: "legal" | "amenity" | "planning" | "supplier"): Promise<void> {
    const modal = this.modal(type);
    await this.firstVisible(modal.locator(".btn-modal-cancel, .btn-close")).click();
    await expect(modal).toBeHidden();
  }

  private async saveModal(type: "legal" | "amenity" | "planning" | "supplier"): Promise<void> {
    await this.modal(type).locator(".btn-modal-save").click();
  }

  async addLegalAuthority(data: LegalAuthorityForm): Promise<void> {
    await this.openCreateModal("legal");
    await this.page.locator("#legal-authorityName").fill(data.authorityName);
    await this.page.locator("#legal-authorityType").selectOption(data.authorityType);
    await this.page.locator("#legal-phone").fill(data.phone);
    await this.page.locator("#legal-email").fill(data.email);
    await this.page.locator("#legal-address").fill(data.address);
    await this.page.locator("#legal-note").fill(data.note ?? "");
    await this.saveModal("legal");
  }

  async editLegalAuthority(currentName: string, data: Partial<LegalAuthorityForm>): Promise<void> {
    await this.rowByName("legal", currentName).locator(".btn-edit").click();
    await expect(this.modal("legal")).toBeVisible();
    if (data.authorityName !== undefined) {
      await this.page.locator("#legal-authorityName").fill(data.authorityName);
    }
    if (data.authorityType !== undefined) {
      await this.page.locator("#legal-authorityType").selectOption(data.authorityType);
    }
    if (data.phone !== undefined) {
      await this.page.locator("#legal-phone").fill(data.phone);
    }
    if (data.email !== undefined) {
      await this.page.locator("#legal-email").fill(data.email);
    }
    if (data.address !== undefined) {
      await this.page.locator("#legal-address").fill(data.address);
    }
    if (data.note !== undefined) {
      await this.page.locator("#legal-note").fill(data.note);
    }
    await this.saveModal("legal");
  }

  async deleteLegalAuthority(name: string): Promise<void> {
    await this.rowByName("legal", name).locator(".btn-delete").click();
    await this.confirmSweetAlert();
  }

  async expectLegalAuthorityVisible(name: string): Promise<void> {
    await expect(this.rowByName("legal", name)).toBeVisible();
  }

  async addAmenity(data: AmenityForm): Promise<void> {
    await this.openCreateModal("amenity");
    await this.page.locator("#amenity-name").fill(data.name);
    await this.page.locator("#amenity-amenityType").selectOption(data.amenityType);
    await this.page.locator("#amenity-address").fill(data.address);
    await this.page.locator("#amenity-latitude").evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, data.latitude);
    await this.page.locator("#amenity-longitude").evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, data.longitude);
    await this.page.locator("#amenity-distanceMeter").evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, data.distanceMeter ?? "500");
    await this.saveModal("amenity");
  }

  async expectAmenityVisible(name: string): Promise<void> {
    await expect(this.rowByName("amenity", name)).toBeVisible();
  }

  async addPlanningMap(data: PlanningMapForm): Promise<void> {
    await this.openCreateModal("planning");
    await this.page.locator("#planning-mapType").fill(data.mapType);
    await this.page.locator("#planning-issuedBy").fill(data.issuedBy);
    await this.page.locator("#planning-issuedDate").fill(data.issuedDate);
    await this.page.locator("#planning-expiredDate").fill(data.expiredDate);
    await this.page.locator("#planning-note").fill(data.note ?? "");
    await this.page.locator("#planning-imageUrl").evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, data.existingImageUrl);
    await this.saveModal("planning");
  }

  async expectPlanningMapVisible(mapType: string): Promise<void> {
    await expect(this.rowByName("planning", mapType)).toBeVisible();
  }

  async deletePlanningMap(mapType: string): Promise<void> {
    await this.rowByName("planning", mapType).locator(".btn-delete").click();
    await this.confirmSweetAlert();
  }

  async addSupplier(data: SupplierForm): Promise<void> {
    await this.openCreateModal("supplier");
    await this.page.locator("#supplier-name").fill(data.name);
    await this.page.locator("#supplier-serviceType").fill(data.serviceType);
    await this.page.locator("#supplier-phone").fill(data.phone);
    await this.page.locator("#supplier-email").fill(data.email);
    await this.page.locator("#supplier-address").fill(data.address ?? "");
    await this.page.locator("#supplier-note").fill(data.note ?? "");
    await this.saveModal("supplier");
  }

  async expectSupplierVisible(name: string): Promise<void> {
    await expect(this.rowByName("supplier", name)).toBeVisible();
  }

  async expectValidationPopupContains(text: string | RegExp): Promise<void> {
    await expect(this.toastPopup()).toBeVisible();
    await expect(this.toastPopup()).toContainText(text);
    await this.confirmSweetAlert();
    await expect(this.toastPopup()).toBeHidden();
  }
}
