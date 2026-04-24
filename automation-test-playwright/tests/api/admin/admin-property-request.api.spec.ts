import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectObjectBody, expectPageBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CleanupHelper } from "@helpers/CleanupHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { createPropertyRequestScenario } from "@data/propertyRequestScenario";

test.describe("Admin - API Property Request @regression", () => {
  test.afterAll(async () => {
  });

  test("[API-ADM-PRQ-001] - API Admin Property Request - Listing - Anonymous Access Rejection", async ({ playwright }) => {
    const context = await createAnonymousContext(playwright);
    try {
      const response = await context.get("/api/v1/admin/property-requests?page=1&size=5", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/admin/property-requests"
      });
    } finally {
      await context.dispose();
    }
  });

  test("[API-ADM-PRQ-002] - API Admin Property Request - Listing - Pending Request Page Schema", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const response = await scenario.admin.get("/api/v1/admin/property-requests?page=1&size=10&status=PENDING", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const payload = await expectPageBody<{ content?: Array<{ id: number; status?: string }> }>(response, { status: 200 });
      expect(payload.content?.some((item) => item.id === scenario.propertyRequestId && item.status === "PENDING")).toBeTruthy();
    } finally {
      await CleanupHelper.run([
        { label: `Cleanup property request scenario ${scenario.propertyRequestId}`, action: () => scenario.cleanup() }
      ]);
    }
  });

  test("[API-ADM-PRQ-003] - API Admin Property Request - Rent Request Detail - Contract Autofill Data Retrieval @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const detail = await expectObjectBody<{
        id?: number;
        buildingId?: number;
        customerId?: number;
        status?: string;
        requestType?: string;
      }>(detailResponse, 200, ["id", "buildingId", "customerId", "status", "requestType"]);
      expect(detail.id).toBe(scenario.propertyRequestId);
      expect(detail.buildingId).toBe(scenario.buildingId);
      expect(detail.customerId).toBe(scenario.customerId);
      expect(detail.status).toBe("PENDING");
      expect(detail.requestType).toBe("RENT");

      const contractDataResponse = await scenario.admin.get(
        `/api/v1/admin/property-requests/${scenario.propertyRequestId}/contract-data`,
        { failOnStatusCode: false, maxRedirects: 0 }
      );
      const contractData = await expectObjectBody<{ buildingId?: number; customerId?: number; rentArea?: number }>(
        contractDataResponse,
        200,
        ["buildingId", "customerId", "rentArea"]
      );
      expect(contractData.buildingId).toBe(scenario.buildingId);
      expect(contractData.customerId).toBe(scenario.customerId);
      expect(typeof contractData.rentArea).toBe("number");
    } finally {
      await CleanupHelper.run([
        { label: `Cleanup property request scenario ${scenario.propertyRequestId}`, action: () => scenario.cleanup() }
      ]);
    }
  });

  test("[API-ADM-PRQ-004] - API Admin Property Request - Buy Request Detail - Sale Contract Autofill Data Retrieval @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "BUY");
    try {
      const response = await scenario.admin.get(
        `/api/v1/admin/property-requests/${scenario.propertyRequestId}/sale-contract-data`,
        { failOnStatusCode: false, maxRedirects: 0 }
      );
      const payload = await expectObjectBody<{ buildingId?: number; customerId?: number; salePrice?: number }>(
        response,
        200,
        ["buildingId", "customerId", "salePrice"]
      );
      expect(payload.buildingId).toBe(scenario.buildingId);
      expect(payload.customerId).toBe(scenario.customerId);
      expect(typeof payload.salePrice).toBe("number");
    } finally {
      await scenario.cleanup();
    }
  });

  test("[API-ADM-PRQ-005] - API Admin Property Request - Pending Request Status - Rejection with Status Update @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const rejectResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/reject`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { reason: "Contract data mismatch" }
      });
      await expectApiMessage(rejectResponse, {
        status: 200,
        message: apiExpectedMessages.admin.propertyRequests.reject,
        dataMode: "null"
      });

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const detail = await expectObjectBody<{ status?: string; adminNote?: string }>(detailResponse, 200, ["status"]);
      expect(detail.status).toBe("REJECTED");
      expect(detail.adminNote).toBe("Contract data mismatch");

      const rows = await MySqlDbClient.query<{ status: string; admin_note: string }>(
        "SELECT status, admin_note FROM property_request WHERE id = ?",
        [scenario.propertyRequestId]
      );
      expect(rows[0]?.status).toBe("REJECTED");
      expect(rows[0]?.admin_note).toBe("Contract data mismatch");
    } finally {
      await scenario.cleanup();
    }
  });

  test("[API-ADM-PRQ-006] - API Admin Property Request - Rent Request Approval - Linked Contract Matching Approval @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    let contractId = 0;

    try {
      const createContractResponse = await scenario.admin.post("/api/v1/admin/contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildContractPayload({
          customerId: scenario.customerId,
          buildingId: scenario.buildingId,
          staffId: scenario.staffId
        })
      });
      await expectApiMessage(createContractResponse, {
        status: 200,
        message: apiExpectedMessages.admin.contracts.create,
        dataMode: "null"
      });

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
      contractId = contractRows[0]?.id ?? 0;
      expect(contractId).toBeGreaterThan(0);

      const approveResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/approve`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { contractId }
      });
      await expectApiMessage(approveResponse, {
        status: 200,
        message: apiExpectedMessages.admin.propertyRequests.approve,
        dataMode: "null"
      });

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const detail = await expectObjectBody<{ status?: string; contractId?: number }>(detailResponse, 200, ["status"]);
      expect(detail.status).toBe("APPROVED");
      expect(detail.contractId).toBe(contractId);

      const rows = await MySqlDbClient.query<{ status: string; contract_id: number }>(
        "SELECT status, contract_id FROM property_request WHERE id = ?",
        [scenario.propertyRequestId]
      );
      expect(rows[0]?.status).toBe("APPROVED");
      expect(rows[0]?.contract_id).toBe(contractId);

      const pendingResponse = await scenario.admin.get("/api/v1/admin/property-requests/pending-count", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const pendingBody = await expectObjectBody<{ pendingCount?: number }>(pendingResponse, 200, ["pendingCount"]);
      expect(typeof pendingBody.pendingCount).toBe("number");
      expect(pendingBody.pendingCount).toBeGreaterThanOrEqual(0);
    } finally {
      await CleanupHelper.run([
        { label: `Delete property request ${scenario.propertyRequestId}`, action: () => MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [scenario.propertyRequestId]) },
        {
          label: `Delete contract ${contractId || "(none)"}`,
          action: () => contractId
            ? scenario.admin.delete(`/api/v1/admin/contracts/${contractId}`, { failOnStatusCode: false })
            : undefined
        },
        { label: `Cleanup property request scenario ${scenario.propertyRequestId}`, action: () => scenario.cleanup() }
      ]);
    }
  });

  test("[API-ADM-PRQ-007] - API Admin Property Request - Buy Request Approval - Linked Sale Contract Matching Approval @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "BUY");
    let saleContractId = 0;

    try {
      const createSaleContractResponse = await scenario.admin.post("/api/v1/admin/sale-contracts", {
        failOnStatusCode: false,
        data: TestDataFactory.buildSaleContractPayload({
          buildingId: scenario.buildingId,
          customerId: scenario.customerId,
          staffId: scenario.staffId
        })
      });
      await expectApiMessage(createSaleContractResponse, {
        status: 200,
        message: apiExpectedMessages.admin.saleContracts.create,
        dataMode: "null"
      });

      const saleContractRows = await MySqlDbClient.query<{ id: number }>(
        `
          SELECT id
          FROM sale_contract
          WHERE customer_id = ? AND building_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [scenario.customerId, scenario.buildingId]
      );
      saleContractId = saleContractRows[0]?.id ?? 0;
      expect(saleContractId).toBeGreaterThan(0);

      const approveResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/approve`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { saleContractId }
      });
      await expectApiMessage(approveResponse, {
        status: 200,
        message: apiExpectedMessages.admin.propertyRequests.approve,
        dataMode: "null"
      });

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const detail = await expectObjectBody<{ status?: string; saleContractId?: number }>(detailResponse, 200, ["status"]);
      expect(detail.status).toBe("APPROVED");
      expect(detail.saleContractId).toBe(saleContractId);

      const rows = await MySqlDbClient.query<{ status: string; sale_contract_id: number }>(
        "SELECT status, sale_contract_id FROM property_request WHERE id = ?",
        [scenario.propertyRequestId]
      );
      expect(rows[0]?.status).toBe("APPROVED");
      expect(rows[0]?.sale_contract_id).toBe(saleContractId);
    } finally {
      await CleanupHelper.run([
        { label: `Delete property request ${scenario.propertyRequestId}`, action: () => MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [scenario.propertyRequestId]) },
        {
          label: `Delete sale contract ${saleContractId || "(none)"}`,
          action: () => saleContractId
            ? scenario.admin.delete(`/api/v1/admin/sale-contracts/${saleContractId}`, { failOnStatusCode: false })
            : undefined
        },
        { label: `Cleanup property request scenario ${scenario.propertyRequestId}`, action: () => scenario.cleanup() }
      ]);
    }
  });

  test("[API-ADM-PRQ-008] - API Admin Property Request - Request ID - Nonexistent Request 400 Response @extended", async ({ playwright }) => {
    const admin = await createRoleContext(playwright, "admin");
    try {
      const response = await admin.get("/api/v1/admin/property-requests/999999999", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/property-requests/999999999"
      });
    } finally {
      await admin.dispose();
    }
  });
});




