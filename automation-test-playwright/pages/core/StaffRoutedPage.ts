import { StaffShellPage } from "./StaffShellPage";

export abstract class StaffRoutedPage extends StaffShellPage {
  protected abstract readonly path: string;

  async open(): Promise<void> {
    await this.visit(this.path);
  }
}
