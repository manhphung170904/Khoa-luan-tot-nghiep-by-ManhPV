import { CustomerShellPage } from "./CustomerShellPage";

export abstract class CustomerRoutedPage extends CustomerShellPage {
  protected abstract readonly path: string;

  async open(): Promise<void> {
    await this.visit(this.path);
  }
}
