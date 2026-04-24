import { test as base } from "./api.fixture";
import { PublicLandingPage } from "@pages/public/PublicLandingPage";

type AppFixtures = {
  publicPage: PublicLandingPage;
};

export const test = base.extend<AppFixtures>({
  publicPage: async ({ page }, use) => {
    await use(new PublicLandingPage(page));
  }
});

export { expect } from "@playwright/test";
