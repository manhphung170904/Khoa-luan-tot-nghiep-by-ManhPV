import { CrudDetailPage } from "./CrudDetailPage";

export abstract class RoutedCrudDetailPage extends CrudDetailPage {
  protected abstract readonly detailPath: string;

  async open(id: number): Promise<void> {
    await this.visit(`${this.detailPath}/${id}`);
  }
}
