import { type Page } from "@playwright/test";
import { ProfilePageBase } from "../core/ProfilePageBase";

export class AdminProfilePage extends ProfilePageBase {
  constructor(page: Page) {
    super(page, "/admin/profile", /thông tin cá nhân|thong tin ca nhan|profile/i, ".info-box");
  }
}
