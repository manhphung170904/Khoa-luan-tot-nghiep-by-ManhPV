# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automation-test-playwright\tests\e2e\payment\customer-invoice-payment.e2e.spec.ts >> Customer Invoice Payment E2E @regression >> [E2E-CUS-PAY-004] customer without unpaid invoices sees the empty state
- Location: automation-test-playwright\tests\e2e\payment\customer-invoice-payment.e2e.spec.ts:156:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { expect, type Locator, type Page } from "@playwright/test";
  2  | import { env } from "@config/env";
  3  | 
  4  | export class BasePage {
  5  |   protected readonly page: Page;
  6  | 
  7  |   constructor(page: Page) {
  8  |     this.page = page;
  9  |   }
  10 | 
  11 |   async visit(path: string): Promise<void> {
> 12 |     await this.page.goto(path, { waitUntil: "domcontentloaded", timeout: env.navigationTimeout });
     |                     ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  13 |   }
  14 | 
  15 |   locator(selector: string): Locator {
  16 |     return this.page.locator(selector);
  17 |   }
  18 | 
  19 |   anyLocator(...selectors: string[]): Locator {
  20 |     return this.page.locator(selectors.join(", "));
  21 |   }
  22 | 
  23 |   testId(id: string): Locator {
  24 |     return this.page.getByTestId(id);
  25 |   }
  26 | 
  27 |   inputByName(name: string): Locator {
  28 |     return this.page.locator(`[name="${name}"]`);
  29 |   }
  30 | 
  31 |   inputById(id: string): Locator {
  32 |     return this.page.locator(`#${id}`);
  33 |   }
  34 | 
  35 |   buttonByText(text: string): Locator {
  36 |     return this.page.getByRole("button", { name: new RegExp(text, "i") });
  37 |   }
  38 | 
  39 |   linkByText(text: string): Locator {
  40 |     return this.page.getByRole("link", { name: new RegExp(text, "i") });
  41 |   }
  42 | 
  43 |   linkByHref(href: string): Locator {
  44 |     return this.page.locator(`a[href="${href}"]`);
  45 |   }
  46 | 
  47 |   modalById(id: string): Locator {
  48 |     return this.page.locator(`#${id}`);
  49 |   }
  50 | 
  51 |   toastPopup(): Locator {
  52 |     return this.page.locator(".swal2-popup");
  53 |   }
  54 | 
  55 |   async expectPath(pathPattern: RegExp | string): Promise<void> {
  56 |     if (typeof pathPattern === "string") {
  57 |       await expect(this.page).toHaveURL(new RegExp(pathPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  58 |       return;
  59 |     }
  60 | 
  61 |     await expect(this.page).toHaveURL(pathPattern);
  62 |   }
  63 | 
  64 |   async expectToastMessage(text: string): Promise<void> {
  65 |     await expect(this.toastPopup()).toContainText(text);
  66 |   }
  67 | 
  68 |   async confirmSweetAlert(): Promise<void> {
  69 |     await this.page.locator(".swal2-confirm").click();
  70 |   }
  71 | 
  72 |   async cancelSweetAlert(): Promise<void> {
  73 |     await this.page.locator(".swal2-cancel").click();
  74 |   }
  75 | 
  76 |   async dismissSweetAlertIfPresent(): Promise<void> {
  77 |     const popup = this.page.locator(".swal2-popup.swal2-show");
  78 |     if (!(await popup.count())) {
  79 |       return;
  80 |     }
  81 | 
  82 |     const confirmButton = this.page.locator(".swal2-confirm");
  83 |     if (await confirmButton.count()) {
  84 |       await confirmButton.click();
  85 |       await expect(popup).toBeHidden();
  86 |     }
  87 |   }
  88 | }
  89 | 
```