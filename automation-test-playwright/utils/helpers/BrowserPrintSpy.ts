import type { Page } from "@playwright/test";

export class BrowserPrintSpy {
  private printTriggered = false;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.exposeFunction("__e2eMarkPrint", () => {
      this.printTriggered = true;
    });
    await this.page.evaluate(() => {
      const originalPrint = window.print;
      window.print = () => {
        void (window as typeof window & { __e2eMarkPrint: () => void }).__e2eMarkPrint();
        window.print = originalPrint;
      };
    });
  }

  wasTriggered(): boolean {
    return this.printTriggered;
  }
}
