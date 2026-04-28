import { expect, type Locator, type Page } from "@playwright/test";
import { env } from "@config/env";
import { TextNormalizeHelper } from "@helpers/TextNormalizeHelper";
import { SweetAlertComponent } from "../components/SweetAlertComponent";

export class BasePage {
  protected readonly page: Page;
  protected readonly sweetAlertComponent: SweetAlertComponent;

  constructor(page: Page) {
    this.page = page;
    this.sweetAlertComponent = new SweetAlertComponent(page);
  }

  async visit(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: "domcontentloaded", timeout: env.navigationTimeout });
  }

  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  anyLocator(...selectors: string[]): Locator {
    return this.page.locator(selectors.join(", "));
  }

  visible(locator: Locator): Locator {
    return locator.filter({ visible: true });
  }

  firstVisible(locator: Locator): Locator {
    return this.visible(locator).nth(0);
  }

  lastVisible(locator: Locator): Locator {
    return this.visible(locator).nth(-1);
  }

  testId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  inputByName(name: string): Locator {
    return this.page.locator(`[name="${name}"]`);
  }

  inputById(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  buttonByText(text: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(this.escapeRegExp(text), "i") });
  }

  actionButton(scope: Locator, action: "view" | "edit" | "delete" | "pay" | "approve" | "reject"): Locator {
    const accessibleNameByAction: Record<typeof action, RegExp> = {
      view: /view|detail|xem|chi tiết|chi tiet/i,
      edit: /edit|update|sửa|sua|chỉnh|chinh/i,
      delete: /delete|remove|xóa|xoa/i,
      pay: /pay|payment|thanh toán|thanh toan/i,
      approve: /approve|duyệt|duyet/i,
      reject: /reject|từ chối|tu choi/i
    };
    const cssSelectorByAction: Record<typeof action, string> = {
      view: ".btn-view, .btn-action.btn-view, [data-action='view'], [title*='Xem'], [title*='chi tiết'], [title*='detail']",
      edit: ".btn-edit, .btn-action.btn-edit, [data-action='edit'], [title*='Chỉnh'], [title*='sửa'], [title*='Edit']",
      delete: ".btn-delete, .btn-action.btn-delete, [data-action='delete'], [title*='Xóa'], [title*='Delete']",
      pay: ".btn-pay, .btn-action.btn-pay, [data-action='pay'], [title*='Thanh toán'], [title*='Payment']",
      approve: ".btn-approve, .btn-action.btn-approve, [data-action='approve'], [title*='Duyệt'], [title*='Approve']",
      reject: ".btn-reject, .btn-action.btn-reject, [data-action='reject'], [title*='Từ chối'], [title*='Reject']"
    };
    return scope
      .getByTestId(new RegExp(`${action}|${action}-button|button-${action}`, "i"))
      .or(scope.locator(cssSelectorByAction[action]))
      .or(scope.getByRole("button", { name: accessibleNameByAction[action] }))
      .or(scope.getByRole("link", { name: accessibleNameByAction[action] }))
      .filter({ visible: true })
      .first();
  }

  linkByText(text: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(this.escapeRegExp(text), "i") });
  }

  linkByHref(href: string): Locator {
    return this.page.locator(`a[href="${href}"]`);
  }

  modalById(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  toastPopup(): Locator {
    return this.page.locator(".swal2-popup").filter({ visible: true }).first();
  }

  async setInputValue(locator: Locator, value: string): Promise<void> {
    const isVisible = await locator.isVisible().catch(() => false);
    const isEditable = await locator.isEditable().catch(() => false);
    if (isVisible && isEditable) {
      await locator.fill(value);
      return;
    }

    await locator.evaluate((element, nextValue) => {
      const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      input.value = String(nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }

  protected escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  protected normalizeLooseText(value: string): string {
    return TextNormalizeHelper.normalizeLooseText(value);
  }

  async locatorLooseText(locator: Locator): Promise<string> {
    return this.normalizeLooseText((await locator.textContent()) ?? "");
  }

  async expectPath(pathPattern: RegExp | string): Promise<void> {
    if (typeof pathPattern === "string") {
      await expect(this.page).toHaveURL(new RegExp(pathPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return;
    }

    await expect(this.page).toHaveURL(pathPattern);
  }

  async expectToastMessage(text: string): Promise<void> {
    await expect(this.toastPopup()).toContainText(text);
  }

  async expectSweetAlertContainsText(text: string | RegExp): Promise<void> {
    await this.sweetAlertComponent.expectContainsLoose(text);
  }

  async confirmSweetAlert(): Promise<void> {
    await this.sweetAlertComponent.expectVisible();
    await this.sweetAlertComponent.confirm();
  }

  async cancelSweetAlert(): Promise<void> {
    await this.sweetAlertComponent.expectVisible();
    await this.sweetAlertComponent.cancel();
  }

  async dismissSweetAlertIfPresent(): Promise<void> {
    await this.sweetAlertComponent.confirmIfPresent();
  }
}
