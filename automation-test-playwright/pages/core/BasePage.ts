import { expect, type Locator, type Page } from "@playwright/test";
import { env } from "@config/env";

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
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
    const repaired = value
      .replace(/Ã³/g, "ó")
      .replace(/Ã²/g, "ò")
      .replace(/Ã¡/g, "á")
      .replace(/Ã /g, "à")
      .replace(/Ã¢/g, "â")
      .replace(/Ãª/g, "ê")
      .replace(/Ã´/g, "ô")
      .replace(/Æ¡/g, "ơ")
      .replace(/Æ°/g, "ư")
      .replace(/Ä‘/g, "đ")
      .replace(/áº¿/g, "ế")
      .replace(/á»‡/g, "ệ")
      .replace(/á»‹/g, "ị")
      .replace(/á»/g, "ỏ")
      .replace(/á»“/g, "ồ")
      .replace(/á»£/g, "ợ")
      .replace(/á»¯/g, "ữ")
      .replace(/á»­/g, "ử")
      .replace(/á»™/g, "ộ")
      .replace(/áº¥/g, "ấ")
      .replace(/áº¡/g, "ạ")
      .replace(/á»ƒ/g, "ể")
      .replace(/á»‰/g, "ỉ")
      .replace(/á»§/g, "ủ")
      .replace(/áº£/g, "ả")
      .replace(/á»±/g, "ự")
      .replace(/á»Ÿ/g, "ở");

    return repaired
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
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
    const popup = this.toastPopup();
    await expect(popup).toBeVisible();
    await expect(async () => {
      const normalizedText = this.normalizeLooseText((await popup.textContent()) ?? "");
      expect(normalizedText).not.toMatch(/dang xu ly|vui long doi|processing|please wait/i);
    }).toPass({ timeout: env.expectTimeout });

    await expect(async () => {
      const rawText = ((await popup.textContent()) ?? "").trim();
      const normalizedText = this.normalizeLooseText(rawText);
      if (typeof text === "string") {
        expect(rawText.includes(text) || normalizedText.includes(this.normalizeLooseText(text))).toBeTruthy();
        return;
      }

      const normalizedPattern = new RegExp(this.normalizeLooseText(text.source), text.flags.replace("g", ""));
      expect(text.test(rawText) || normalizedPattern.test(normalizedText)).toBeTruthy();
    }).toPass({ timeout: env.expectTimeout });
  }

  async confirmSweetAlert(): Promise<void> {
    const popup = this.toastPopup();
    await expect(popup).toBeVisible();
    await this.page.locator(".swal2-confirm").filter({ visible: true }).first()
      .or(this.page.getByRole("button", { name: /ok|đồng ý|dong y|xác nhận|xac nhan|confirm|yes/i }))
      .first()
      .click();
  }

  async cancelSweetAlert(): Promise<void> {
    const popup = this.toastPopup();
    await expect(popup).toBeVisible();
    await this.page.locator(".swal2-cancel").filter({ visible: true }).first()
      .or(this.page.getByRole("button", { name: /hủy|huy|cancel|no/i }))
      .first()
      .click();
  }

  async dismissSweetAlertIfPresent(): Promise<void> {
    const popup = this.toastPopup();
    if (!(await popup.count())) {
      return;
    }

    const confirmButton = this.page.getByRole("button", { name: /ok|đồng ý|dong y|xác nhận|xac nhan|confirm|yes/i });
    if (await confirmButton.count()) {
      await confirmButton.click();
      await expect(popup).toBeHidden();
    }
  }
}
