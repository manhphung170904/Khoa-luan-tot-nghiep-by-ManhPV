import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminContractFormPage } from "@pages/admin/AdminContractFormPage";
import { AdminPropertyRequestDetailPage } from "@pages/admin/AdminPropertyRequestDetailPage";
import { AdminPropertyRequestListPage } from "@pages/admin/AdminPropertyRequestListPage";
import { AdminSaleContractFormPage } from "@pages/admin/AdminSaleContractFormPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "@data/profileTempUsers";
import { createPropertyRequestScenario, type PropertyRequestScenario } from "@data/propertyRequestScenario";

test.describe("Admin - Property Request Management @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  let scenario: PropertyRequestScenario | null = null;
  let createdContractId = 0;
  let createdSaleContractId = 0;

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto("/admin/property-request/list");
  });

  test.afterEach(async () => {
    if (scenario?.admin) {
      if (createdContractId) {
        await scenario.admin.delete(`/api/v1/admin/contracts/${createdContractId}`, { failOnStatusCode: false });
        createdContractId = 0;
      }
      if (createdSaleContractId) {
        await scenario.admin.delete(`/api/v1/admin/sale-contracts/${createdSaleContractId}`, { failOnStatusCode: false });
        createdSaleContractId = 0;
      }
    }

    if (scenario) {
      await scenario.cleanup().catch(() => {});
      scenario = null;
    }

    await cleanupTempStaffProfileUser(bootstrapAdminApi, adminUser);
    adminUser = null;
  });

  test.afterAll(async () => {
    await bootstrapAdminApi.dispose();
  });

  test("[E2E-ADM-PRQ-001] - Admin Property Request Management - Request Filter - Pending Request Filter and Detail View", async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");

    const listPage = new AdminPropertyRequestListPage(page);
    const detailPage = new AdminPropertyRequestDetailPage(page);

    await page.goto("/admin/property-request/list");
    await listPage.expectLoaded();
    await listPage.filterByStatus("PENDING");
    await listPage.waitForTableData();
    await expect(listPage.rowByRequestId(scenario.propertyRequestId)).toBeVisible();
    await listPage.openDetail(scenario.propertyRequestId);
    await detailPage.expectLoaded(scenario.propertyRequestId);
  });

  test("[E2E-ADM-PRQ-002] - Admin Property Request Management - Request Rejection - Pending Request Rejection with Reason", async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");
    const detailPage = new AdminPropertyRequestDetailPage(page);

    await page.goto(`/admin/property-request/${scenario.propertyRequestId}`);
    await detailPage.expectLoaded(scenario.propertyRequestId);
    await detailPage.expectPendingActionsVisible();
    await detailPage.rejectRequest("Rejected by Playwright E2E");
    await expect(page.locator(".swal2-popup.swal2-show")).toBeVisible();

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ status: string; admin_note: string }>(
        "SELECT status, admin_note FROM property_request WHERE id = ?",
        [scenario!.propertyRequestId]
      );
      return `${rows[0]?.status ?? ""}|${rows[0]?.admin_note ?? ""}`;
    }).toBe("REJECTED|Rejected by Playwright E2E");
  });

  test("[E2E-ADM-PRQ-003] - Admin Property Request Management - Rent Request Detail - Prefilled Contract Form Navigation", async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");
    const detailPage = new AdminPropertyRequestDetailPage(page);
    const contractFormPage = new AdminContractFormPage(page);

    await page.goto(`/admin/property-request/${scenario.propertyRequestId}`);
    await detailPage.expectLoaded(scenario.propertyRequestId);
    await detailPage.expectCreateContractLink(scenario.propertyRequestId);
    await detailPage.openCreateContractLink(scenario.propertyRequestId);
    await contractFormPage.expectAddLoaded();
    await expect(page.locator("[name='customerId_disabled']")).toHaveCount(1);
    await expect(page.locator("[name='customerId']")).toHaveValue(String(scenario.customerId));
  });

  test("[E2E-ADM-PRQ-004] - Admin Property Request Management - Buy Request Detail - Prefilled Sale Contract Form Navigation", async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "BUY");
    const detailPage = new AdminPropertyRequestDetailPage(page);
    const saleFormPage = new AdminSaleContractFormPage(page);

    await page.goto(`/admin/property-request/${scenario.propertyRequestId}`);
    await detailPage.expectLoaded(scenario.propertyRequestId);
    await detailPage.expectCreateSaleContractLink(scenario.propertyRequestId);
    await detailPage.openCreateSaleContractLink(scenario.propertyRequestId);
    await saleFormPage.expectAddLoaded();
    await expect(page.locator("[name='customerId_disabled']")).toHaveCount(1);
    await expect(page.locator("[name='customerId']")).toHaveValue(String(scenario.customerId));
  });

  test("[E2E-ADM-PRQ-005] - Admin Property Request Management - Processed Result - Linked Contract Display for Approved Rent Request", async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "RENT");
    const contractPayload = TestDataFactory.buildContractPayload({
      customerId: scenario.customerId,
      buildingId: scenario.buildingId,
      staffId: scenario.staffId
    });

    const createContractResponse = await scenario.admin.post("/api/v1/admin/contracts", {
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
      [scenario.customerId, scenario.buildingId]
    );
    expect(contractRows.length).toBe(1);
    createdContractId = contractRows[0]!.id;

    const approveResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/approve`, {
      failOnStatusCode: false,
      data: { contractId: createdContractId }
    });
    expect(approveResponse.status()).toBe(200);

    const detailPage = new AdminPropertyRequestDetailPage(page);
    await page.goto(`/admin/property-request/${scenario.propertyRequestId}`);
    await detailPage.expectLoaded(scenario.propertyRequestId);
    await detailPage.expectProcessedContractLink(createdContractId);

    const rows = await MySqlDbClient.query<{ status: string; contract_id: number | null }>(
      "SELECT status, contract_id FROM property_request WHERE id = ?",
      [scenario.propertyRequestId]
    );
    expect(rows[0]?.status).toBe("APPROVED");
    expect(rows[0]?.contract_id).toBe(createdContractId);
  });

  test("[E2E-ADM-PRQ-006] - Admin Property Request Management - Processed Result - Linked Sale Contract Display for Approved Buy Request", async ({ page, playwright }) => {
    scenario = await createPropertyRequestScenario(playwright, "BUY");
    const salePayload = TestDataFactory.buildSaleContractPayload({
      buildingId: scenario.buildingId,
      customerId: scenario.customerId,
      staffId: scenario.staffId,
      transferDate: null
    });

    const createSaleContractResponse = await scenario.admin.post("/api/v1/admin/sale-contracts", {
      failOnStatusCode: false,
      data: salePayload
    });
    expect(createSaleContractResponse.status()).toBe(200);

    const saleRows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM sale_contract
        WHERE customer_id = ? AND building_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [scenario.customerId, scenario.buildingId]
    );
    expect(saleRows.length).toBe(1);
    createdSaleContractId = saleRows[0]!.id;

    const approveResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/approve`, {
      failOnStatusCode: false,
      data: { saleContractId: createdSaleContractId }
    });
    expect(approveResponse.status()).toBe(200);

    const detailPage = new AdminPropertyRequestDetailPage(page);
    await page.goto(`/admin/property-request/${scenario.propertyRequestId}`);
    await detailPage.expectLoaded(scenario.propertyRequestId);
    await detailPage.expectProcessedSaleContractLink(createdSaleContractId);

    const rows = await MySqlDbClient.query<{ status: string; sale_contract_id: number | null }>(
      "SELECT status, sale_contract_id FROM property_request WHERE id = ?",
      [scenario.propertyRequestId]
    );
    expect(rows[0]?.status).toBe("APPROVED");
    expect(rows[0]?.sale_contract_id).toBe(createdSaleContractId);
  });
});



