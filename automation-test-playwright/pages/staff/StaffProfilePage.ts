import { type Page } from "@playwright/test";
import { ProfilePageBase } from "../core/ProfilePageBase";

export class StaffProfilePage extends ProfilePageBase {
  constructor(page: Page) {
    super(page, "/staff/profile", /tài khoản nhân viên|tai khoan nhan vien|profile/i, ".info-item");
  }
}
