import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { TestDbRepository } from "@db/repositories";
import { CleanupHelper } from "@helpers/CleanupHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { CustomerPropertyRequestListPage } from "@pages/customer/CustomerPropertyRequestListPage";
import { createPropertyRequestScenario, type PropertyRequestScenario } from "@data/propertyRequestScenario";
import { loginAsTempUser } from "@data/profileTempUsers";

test.describe("Customer - Property Request @regression @e2e", () => {
  let scenario: PropertyRequestScenario | null = null;
  let createdContractId = 0;

  test.beforeEach(async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");
    await loginAsTempUser(page, scenario.customerUsername);
    await new NavigationPage(page).open("/customer/property-request/list");
  });

  test.afterEach(async () => {
    if (scenario) {
      if (createdContractId) {
        await CleanupHelper.run([
          { label: `Delete property request ${scenario.propertyRequestId}`, action: () => TestDbRepository.execute("DELETE FROM property_request WHERE id = ?", [scenario!.propertyRequestId]) },
          {
            label: `Delete contract ${createdContractId}`,
            action: () => scenario!.admin.delete(`/api/v1/admin/contracts/${createdContractId}`, { failOnStatusCode: false })
          },
          { label: `Cleanup property request scenario ${scenario.propertyRequestId}`, action: () => scenario!.cleanup() }
        ]);
        createdContractId = 0;
      } else {
        await scenario.cleanup();
      }
    }
    scenario = null;
  });

  test("[E2E-CUS-REQ-001] - Customer Property Request - Property Request List - Pending Request Display", async ({ page }) => {
    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, scenario!.buildingName);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, "Cho xu ly");
    await requestPage.expectCancelButtonVisible(scenario!.propertyRequestId);
  });

  test("[E2E-CUS-REQ-002] - Customer Property Request - Property Request Cancellation - Pending Request Cancellation", async ({ page }) => {
    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.cancelRequest(scenario!.propertyRequestId);
    await requestPage.confirmSweetAlert();
    await requestPage.expectSweetAlertContainsText(/thanh cong|da huy yeu cau|success/i);

    await page.reload();
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, "Da huy");
    await requestPage.expectCancelButtonHidden(scenario!.propertyRequestId);

    const rows = await TestDbRepository.query<{ status: string }>("SELECT status FROM property_request WHERE id = ?", [
      scenario!.propertyRequestId
    ]);
    expect(rows[0]?.status).toBe("CANCELLED");
  });

  test("[E2E-CUS-REQ-003] - Customer Property Request - Property Request Visibility - Approved Request Without Cancellation Action", async ({ page }) => {
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

    const contractRows = await TestDbRepository.query<{ id: number }>(
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

    await new NavigationPage(page).open("/customer/property-request/list");

    const requestPage = new CustomerPropertyRequestListPage(page);
    await requestPage.expectLoaded();
    await requestPage.expectRequestVisible(scenario!.propertyRequestId);
    await requestPage.expectRequestContains(scenario!.propertyRequestId, "Da duyet");
    await requestPage.expectCancelButtonHidden(scenario!.propertyRequestId);

    const rows = await TestDbRepository.query<{ status: string; contract_id: number | null }>(
      "SELECT status, contract_id FROM property_request WHERE id = ?",
      [scenario!.propertyRequestId]
    );
    expect(rows[0]?.status).toBe("APPROVED");
    expect(rows[0]?.contract_id).toBe(contractRows[0]!.id);
  });
});
