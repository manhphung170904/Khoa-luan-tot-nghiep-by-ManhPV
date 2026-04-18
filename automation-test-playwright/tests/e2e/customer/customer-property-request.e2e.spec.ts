import { expect, test } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CustomerPropertyRequestListPage } from "@pages/customer/CustomerPropertyRequestListPage";
import { createPropertyRequestScenario, type PropertyRequestScenario } from "../../api/_fixtures/propertyRequestScenario";
import { loginAsTempUser } from "../_fixtures/profileTempUsers";

test.describe("Customer Property Request E2E @regression", () => {
  let scenario: PropertyRequestScenario | null = null;

  test.beforeEach(async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");
    await loginAsTempUser(page, scenario.customerUsername);
    await page.goto("/customer/property-request/list");
  });

  test.afterEach(async () => {
    if (scenario) {
      await scenario.cleanup();
    }
    scenario = null;
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-REQ-001] customer sees own property request with pending status", async ({ page }) => {
    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, scenario!.buildingName);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, /Chờ xử lý|PENDING/i);
    await requestPage.expectCancelButtonVisible(scenario!.propertyRequestId);
  });

  test("[E2E-CUS-REQ-002] customer can cancel a pending property request", async ({ page }) => {
    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.cancelRequest(scenario!.propertyRequestId);
    await requestPage.confirmSweetAlert();
    await expect(requestPage.toastPopup()).toContainText(/thành công|Đã hủy yêu cầu/i);
    await requestPage.expectEmptyState();

    const rows = await MySqlDbClient.query<{ count: number }>("SELECT COUNT(*) AS count FROM property_request WHERE id = ?", [
      scenario!.propertyRequestId
    ]);
    expect(Number(rows[0]?.count ?? 0)).toBe(0);
  });

  test("[E2E-CUS-REQ-003] approved property request is visible without cancel action", async ({ page }) => {
    await scenario!.admin.post(`/api/v1/admin/property-requests/${scenario!.propertyRequestId}/approve`, {
      failOnStatusCode: false
    });

    await page.goto("/customer/property-request/list");

    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, /Đã duyệt|APPROVED/i);
    await requestPage.expectCancelButtonHidden(scenario!.propertyRequestId);
  });
});
