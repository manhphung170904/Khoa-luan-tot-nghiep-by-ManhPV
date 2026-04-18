import { test as base } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { LoginPage } from "@pages/auth/LoginPage";
import { PublicLandingPage } from "@pages/public/PublicLandingPage";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";

type AppFixtures = {
  loginPage: LoginPage;
  publicPage: PublicLandingPage;
  customerInvoicePage: CustomerInvoicePage;
};

export const test = base.extend<AppFixtures>({
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
