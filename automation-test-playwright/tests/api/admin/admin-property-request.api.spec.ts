import { expect, test } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { createPropertyRequestScenario } from "../_fixtures/propertyRequestScenario";

test.describe("Admin Property Request API @api @regression", () => {
  test.afterAll(async () => {
    await MySqlDbClient.close();
  });

  test("API-ADM-PRQ-001 rejects anonymous list access with API auth status @regression", async ({ playwright }) => {
    const context = await createAnonymousContext(playwright);
    try {
      const response = await context.get("/api/v1/admin/property-requests?page=1&size=5", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(response.status()).toBe(401);
    } finally {
      await context.dispose();
    }
  });

  test("API-ADM-PRQ-002 lists pending requests and exposes page shape @regression", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const response = await scenario.admin.get("/api/v1/admin/property-requests?page=1&size=10&status=PENDING", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(response.status()).toBe(200);

      const payload = (await response.json()) as { content?: Array<{ id: number; status?: string }>; totalElements?: number };
      expect(Array.isArray(payload.content)).toBeTruthy();
      expect(typeof payload.totalElements).toBe("number");
      expect(payload.content?.some((item) => item.id === scenario.propertyRequestId && item.status === "PENDING")).toBeTruthy();
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-003 returns detail and contract autofill for RENT request @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(detailResponse.status()).toBe(200);

      const detail = (await detailResponse.json()) as {
        id?: number;
        buildingId?: number;
        customerId?: number;
        status?: string;
        requestType?: string;
      };
      expect(detail.id).toBe(scenario.propertyRequestId);
      expect(detail.buildingId).toBe(scenario.buildingId);
      expect(detail.customerId).toBe(scenario.customerId);
      expect(detail.status).toBe("PENDING");
      expect(detail.requestType).toBe("RENT");

      const contractDataResponse = await scenario.admin.get(
        `/api/v1/admin/property-requests/${scenario.propertyRequestId}/contract-data`,
        { failOnStatusCode: false, maxRedirects: 0 }
      );
      expect(contractDataResponse.status()).toBe(200);

      const contractData = (await contractDataResponse.json()) as { buildingId?: number; customerId?: number; rentArea?: number };
      expect(contractData.buildingId).toBe(scenario.buildingId);
      expect(contractData.customerId).toBe(scenario.customerId);
      expect(typeof contractData.rentArea).toBe("number");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-004 returns sale contract autofill for BUY request @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "BUY");
    try {
      const response = await scenario.admin.get(
        `/api/v1/admin/property-requests/${scenario.propertyRequestId}/sale-contract-data`,
        { failOnStatusCode: false, maxRedirects: 0 }
      );
      expect(response.status()).toBe(200);

      const payload = (await response.json()) as { buildingId?: number; customerId?: number; salePrice?: number };
      expect(payload.buildingId).toBe(scenario.buildingId);
      expect(payload.customerId).toBe(scenario.customerId);
      expect(typeof payload.salePrice).toBe("number");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-005 rejects a pending request and updates detail status @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const rejectResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/reject`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { reason: "Contract data mismatch" }
      });
      expect(rejectResponse.status()).toBe(200);

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(detailResponse.status()).toBe(200);

      const detail = (await detailResponse.json()) as { status?: string; adminNote?: string };
      expect(detail.status).toBe("REJECTED");
      expect(detail.adminNote).toBe("Contract data mismatch");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-006 approves a RENT request when linked contract matches request @extended", async ({ playwright }) => {
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
      contractId = contractRows[0]?.id ?? 0;
      expect(contractId).toBeGreaterThan(0);

      const approveResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/approve`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { contractId }
      });
      expect(approveResponse.status()).toBe(200);

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(detailResponse.status()).toBe(200);

      const detail = (await detailResponse.json()) as { status?: string; contractId?: number };
      expect(detail.status).toBe("APPROVED");
      expect(detail.contractId).toBe(contractId);

      const pendingResponse = await scenario.admin.get("/api/v1/admin/property-requests/pending-count", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(pendingResponse.status()).toBe(200);

      const pendingBody = (await pendingResponse.json()) as { pendingCount?: number };
      expect(typeof pendingBody.pendingCount).toBe("number");
      expect(pendingBody.pendingCount).toBeGreaterThanOrEqual(0);
    } finally {
      await MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [scenario.propertyRequestId]).catch(() => {});
      if (contractId) {
        await scenario.admin.delete(`/api/v1/admin/contracts/${contractId}`, { failOnStatusCode: false });
      }
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-007 approves a BUY request when linked sale contract matches request @extended", async ({ playwright }) => {
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
      expect(createSaleContractResponse.status()).toBe(200);

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
      expect(approveResponse.status()).toBe(200);

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(detailResponse.status()).toBe(200);

      const detail = (await detailResponse.json()) as { status?: string; saleContractId?: number };
      expect(detail.status).toBe("APPROVED");
      expect(detail.saleContractId).toBe(saleContractId);
    } finally {
      await MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [scenario.propertyRequestId]).catch(() => {});
      if (saleContractId) {
        await scenario.admin.delete(`/api/v1/admin/sale-contracts/${saleContractId}`, { failOnStatusCode: false });
      }
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-008 returns 400 for missing request id @extended", async ({ playwright }) => {
    const admin = await createRoleContext(playwright, "admin");
    try {
      const response = await admin.get("/api/v1/admin/property-requests/999999999", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(response.status()).toBe(400);
      const body = (await response.json()) as { message?: string };
      expect(body.message).toBeTruthy();
    } finally {
      await admin.dispose();
    }
  });
});
