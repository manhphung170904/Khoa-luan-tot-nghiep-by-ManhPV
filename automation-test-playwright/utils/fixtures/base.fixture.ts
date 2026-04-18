import { test as base } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { LoginPage } from "@pages/auth/LoginPage";
import { PublicLandingPage } from "@pages/public/PublicLandingPage";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";

type AppFixtures = {
  adminApi: APIRequestContext;
  loginPage: LoginPage;
  publicPage: PublicLandingPage;
  customerInvoicePage: CustomerInvoicePage;
};

export const test = base.extend<AppFixtures>({
  adminApi: async ({ playwright }, use) => {
    const context = await ApiSessionHelper.newContext(playwright, "admin");
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  publicPage: async ({ page }, use) => {
    await use(new PublicLandingPage(page));
  },
  customerInvoicePage: async ({ page }, use) => {
    await use(new CustomerInvoicePage(page));
  }
});

base.afterAll(async () => {
  await MySqlDbClient.close();
});

export { expect } from "@playwright/test";
