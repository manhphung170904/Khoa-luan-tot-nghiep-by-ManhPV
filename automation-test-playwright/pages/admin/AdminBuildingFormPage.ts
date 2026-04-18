import { expect, type Locator, type Page } from "@playwright/test";
import { RoutedCrudFormPage } from "../core/RoutedCrudFormPage";

export class AdminBuildingFormPage extends RoutedCrudFormPage {
  protected readonly addPath = "/admin/building/add";
  protected readonly editPath = "/admin/building/edit";
  readonly form: Locator;

  constructor(page: Page) {
    super(page);
    this.form = this.page.locator("#buildingForm");
  }

  async expectAddLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/building\/add/);
    await expect(this.form).toBeVisible();
  }

  async expectEditLoaded(buildingId: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/admin/building/edit/${buildingId}$`));
    await expect(this.form).toBeVisible();
  }

  async setTransactionType(value: "FOR_RENT" | "FOR_SALE"): Promise<void> {
    await this.page.locator(`#transactionTypeSelector .type-btn[data-val="${value}"]`).click();
  }

  async fillCommonFields(data: {
    name?: string;
    districtId?: string;
    ward?: string;
    street?: string;
    numberOfFloor?: number;
    numberOfBasement?: number;
    floorArea?: number;
    level?: string;
    direction?: string;
    taxCode?: string;
    linkOfBuilding?: string;
  }): Promise<void> {
    if (data.name) await this.fillTextField("name", data.name);
    if (data.districtId) await this.page.locator('[name="district"]').selectOption(data.districtId);
    if (data.ward) await this.fillTextField("ward", data.ward);
    if (data.street) await this.fillTextField("street", data.street);
    if (typeof data.numberOfFloor === "number") await this.fillNumberField("numberOfFloor", data.numberOfFloor);
    if (typeof data.numberOfBasement === "number") await this.fillNumberField("numberOfBasement", data.numberOfBasement);
    if (typeof data.floorArea === "number") await this.fillNumberField("floorArea", data.floorArea);
    if (data.level) await this.selectOption("level", data.level);
    if (data.direction) await this.selectOption("direction", data.direction);
    if (data.taxCode) await this.fillTextField("taxCode", data.taxCode);
    if (data.linkOfBuilding) await this.fillTextField("linkOfBuilding", data.linkOfBuilding);
  }

  async fillRentFields(data: {
    rentPrice?: number;
    deposit?: number;
    serviceFee?: number;
    carFee?: number;
    motorbikeFee?: number;
    waterFee?: number;
    electricityFee?: number;
    rentAreaValues?: string;
  }): Promise<void> {
    if (typeof data.rentPrice === "number") await this.fillNumberField("rentPrice", data.rentPrice);
    if (typeof data.deposit === "number") await this.fillNumberField("deposit", data.deposit);
    if (typeof data.serviceFee === "number") await this.fillNumberField("serviceFee", data.serviceFee);
    if (typeof data.carFee === "number") await this.fillNumberField("carFee", data.carFee);
    if (typeof data.motorbikeFee === "number") await this.fillNumberField("motorbikeFee", data.motorbikeFee);
    if (typeof data.waterFee === "number") await this.fillNumberField("waterFee", data.waterFee);
    if (typeof data.electricityFee === "number") await this.fillNumberField("electricityFee", data.electricityFee);
    if (data.rentAreaValues) {
      await this.page.evaluate(() => {
        const win = window as typeof window & {
          areaTags?: string[];
          renderTags?: () => void;
        };

        if (Array.isArray(win.areaTags)) {
          win.areaTags.length = 0;
        }

        if (typeof win.renderTags === "function") {
          win.renderTags();
        }
      });

      const tagInput = this.page.locator("#tagRealInput");
      await expect(tagInput).toBeVisible();
      await tagInput.click();
      await tagInput.type(data.rentAreaValues);
      await tagInput.press("Enter");
      await expect(this.page.locator("#rentAreaValuesInput")).toHaveValue(data.rentAreaValues);
    }
  }

  async fillSalePrice(salePrice: number): Promise<void> {
    await this.fillNumberField("salePrice", salePrice);
  }

  async setCoordinates(latitude: number, longitude: number): Promise<void> {
    await this.page.locator('[name="latitude"], #latInput').first().evaluate((element, value) => {
      (element as HTMLInputElement).value = String((value as { lat: number }).lat);
    }, { lat: latitude });
    await this.page.locator('[name="longitude"], #lngInput').first().evaluate((element, value) => {
      (element as HTMLInputElement).value = String((value as { lng: number }).lng);
    }, { lng: longitude });
  }

  async selectStaffIds(staffIds: number[]): Promise<void> {
    for (const staffId of staffIds) {
      await this.page.locator(`input[name="staffIds"][value="${staffId}"]`).check();
    }
  }

  async expectLockBanner(): Promise<void> {
    await expect(this.page.locator("text=không thể chỉnh sửa").first()).toBeVisible();
  }

  async expectSweetAlertContains(text: string | RegExp): Promise<void> {
    await expect(this.page.locator(".swal2-popup")).toContainText(text);
  }
}
