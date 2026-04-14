import { AdminShellPage } from "./AdminShellPage";

export abstract class AdminRoutedPage extends AdminShellPage {
  protected abstract readonly path: string;

  async open(): Promise<void> {
    await this.visit(this.path);
  }
}
