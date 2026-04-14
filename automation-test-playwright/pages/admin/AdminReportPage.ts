import { AdminRoutedPage } from "../core/AdminRoutedPage";

export class AdminReportPage extends AdminRoutedPage {
  protected readonly path = "/admin/report";

  async selectYear(value: string): Promise<void> {
    await this.page.locator('select[name="year"], select').first().selectOption(value);
  }
}
