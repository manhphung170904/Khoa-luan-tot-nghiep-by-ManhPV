import { expect, test } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { CustomerPropertyRequestListPage } from "@pages/customer/CustomerPropertyRequestListPage";
import { createPropertyRequestScenario, type PropertyRequestScenario } from "../../api/_fixtures/propertyRequestScenario";
import { loginAsTempUser } from "../_fixtures/profileTempUsers";

test.describe("Customer Property Request E2E @regression", () => {
  let scenario: PropertyRequestScenario | null = null;
  let createdContractId = 0;

  test.beforeEach(async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");
    await loginAsTempUser(page, scenario.customerUsername);
    await page.goto("/customer/property-request/list");
  });

  test.afterEach(async () => {
    if (scenario) {
      if (createdContractId) {
        await scenario.customer.dispose().catch(() => {});
        await MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [scenario.propertyRequestId]).catch(() => {});
        await MySqlDbClient.execute("DELETE FROM contract WHERE id = ?", [createdContractId]).catch(() => {});
        await MySqlDbClient.execute("DELETE FROM customer WHERE id = ?", [scenario.customerId]).catch(() => {});
        await MySqlDbClient.execute("DELETE FROM building WHERE id = ?", [scenario.buildingId]).catch(() => {});
        await MySqlDbClient.execute("DELETE FROM staff WHERE id = ?", [scenario.staffId]).catch(() => {});
        await scenario.admin.dispose().catch(() => {});
        createdContractId = 0;
      } else {
        await scenario.cleanup();
      }
    }
    scenario = null;
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-REQ-001] customer sees own property request with pending status", async ({ page }) => {
    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, scenario!.buildingName);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, /Chờ xử lý|Cho xu ly|PENDING/i);
    await requestPage.expectCancelButtonVisible(scenario!.propertyRequestId);
  });

  test("[E2E-CUS-REQ-002] customer can cancel a pending property request", async ({ page }) => {
    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.cancelRequest(scenario!.propertyRequestId);
    await requestPage.confirmSweetAlert();
    await expect(requestPage.toastPopup()).toContainText(/Thành công|Hủy yêu cầu bất động sản thành công|thanh cong|da huy yeu cau/i);

    await page.reload();
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, /Đã hủy|Da huy|CANCELLED/i);
    await requestPage.expectCancelButtonHidden(scenario!.propertyRequestId);

    const rows = await MySqlDbClient.query<{ status: string }>("SELECT status FROM property_request WHERE id = ?", [
      scenario!.propertyRequestId
    ]);
    expect(rows[0]?.status).toBe("CANCELLED");
  });

  test("[E2E-CUS-REQ-003] approved property request is visible without cancel action", async ({ page }) => {
    const contractPayload = TestDataFactory.buildContractPayload({
      customerId: scenario!.customerId,
      buildingId: scenario!.buildingId,
      staffId: scenario!.staffId
    });

    const createContractResponse = await scenario!.admin.post("/api/v1/admin/contracts", {
      failOnStatusCode: false,
      data: contractPayload
    });
    expect(createContractResponse.status()).toBe(200);

    const contractRows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM contract
        WHERE customer_id = ? AND building_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [scenario!.customerId, scenario!.buildingId]
    );
    expect(contractRows.length).toBe(1);
    createdContractId = contractRows[0]!.id;

    const approveResponse = await scenario!.admin.post(`/api/v1/admin/property-requests/${scenario!.propertyRequestId}/approve`, {
      failOnStatusCode: false,
      data: { contractId: contractRows[0]!.id }
    });
    expect(approveResponse.status()).toBe(200);

    await page.goto("/customer/property-request/list");

    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, /Đã duyệt|Da duyet|APPROVED/i);
    await requestPage.expectCancelButtonHidden(scenario!.propertyRequestId);

    const rows = await MySqlDbClient.query<{ status: string; contract_id: number | null }>(
      "SELECT status, contract_id FROM property_request WHERE id = ?",
      [scenario!.propertyRequestId]
    );
    expect(rows[0]?.status).toBe("APPROVED");
    expect(rows[0]?.contract_id).toBe(contractRows[0]!.id);
  });
});
