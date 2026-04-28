import { type Locator, type Page } from "@playwright/test";
import { BootstrapModalComponent } from "./BootstrapModalComponent";

export type ProfileModalKind = "username" | "phone" | "password";

export class ProfileModalComponent {
  private readonly bootstrapModal: BootstrapModalComponent;

  constructor(private readonly page: Page) {
    this.bootstrapModal = new BootstrapModalComponent(page);
  }

  modal(kind: ProfileModalKind): Locator {
    const idByKind: Record<ProfileModalKind, string> = {
      username: "editUsernameModal",
      phone: "editPhoneModal",
      password: "changePasswordModal"
    };
    return this.bootstrapModal.byId(idByKind[kind]);
  }

  action(kind: ProfileModalKind): Locator {
    const targetByKind: Record<ProfileModalKind, string> = {
      username: "#editUsernameModal",
      phone: "#editPhoneModal",
      password: "#changePasswordModal"
    };
    return this.page.locator(`[data-bs-target="${targetByKind[kind]}"]`).filter({ visible: true }).first();
  }

  async open(kind: ProfileModalKind): Promise<Locator> {
    const modal = this.modal(kind);
    if (!(await modal.isVisible().catch(() => false))) {
      await this.action(kind).click();
    }
    await this.bootstrapModal.expectVisible(modal);
    return modal;
  }

  async sendOtp(kind: ProfileModalKind): Promise<void> {
    await this.modal(kind).getByRole("button", { name: /gửi mã|gui ma|otp/i }).click();
  }
}
