import type { Page } from "@playwright/test";
import { CrudListPage } from "./CrudListPage";

export abstract class RoutedCrudListPage extends CrudListPage {
  protected abstract readonly path: string;

  async open(): Promise<void> {
    await this.visit(this.path);
  }
}
