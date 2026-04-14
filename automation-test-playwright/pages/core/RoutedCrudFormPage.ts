import { CrudFormPage } from "./CrudFormPage";

export abstract class RoutedCrudFormPage extends CrudFormPage {
  protected abstract readonly addPath: string;
  protected readonly editPath?: string;

  async openAdd(): Promise<void> {
    await this.visit(this.addPath);
  }

  async openEdit(id: number): Promise<void> {
    if (!this.editPath) {
      throw new Error("This page does not support edit navigation.");
    }

    await this.visit(`${this.editPath}/${id}`);
  }
}
