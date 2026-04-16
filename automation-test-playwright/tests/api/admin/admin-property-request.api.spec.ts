import { test, expect } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectMessageBody, expectStatusExact } from "@api/apiContractUtils";
import { createPropertyRequestScenario } from "../_fixtures/propertyRequestScenario";

test.describe("Admin Property Request API", () => {
  test("API-ADM-PRQ-001 rejects anonymous list access with API auth status", async ({ playwright }) => {
    const context = await createAnonymousContext(playwright);
    try {
      const response = await context.get("/api/admin/property-request/list/page?page=1&size=5", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect([401, 403]).toContain(response.status());
    } finally {
      await context.dispose();
    }
  });

  test("API-ADM-PRQ-002 lists pending requests and exposes page shape", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const response = await scenario.admin.get("/api/admin/property-request/list/page?page=1&size=10&status=PENDING", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(response, 200, "Admin property request list should succeed");

      const payload = (await response.json()) as { content?: Array<{ id: number; status?: string }>; totalElements?: number };
      expect(Array.isArray(payload.content)).toBeTruthy();
      expect(typeof payload.totalElements).toBe("number");
      expect(payload.content?.some((item) => item.id === scenario.propertyRequestId && item.status === "PENDING")).toBeTruthy();
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-003 returns detail and contract autofill for RENT request", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(detailResponse, 200, "Admin property request detail should succeed");

      const detail = (await detailResponse.json()) as { id?: number; buildingId?: number; customerId?: number; status?: string; requestType?: string };
      expect(detail.id).toBe(scenario.propertyRequestId);
      expect(detail.buildingId).toBe(scenario.buildingId);
      expect(detail.customerId).toBe(scenario.customerId);
      expect(detail.status).toBe("PENDING");
      expect(detail.requestType).toBe("RENT");

      const contractDataResponse = await scenario.admin.get(
        `/api/v1/admin/property-requests/${scenario.propertyRequestId}/contract-data`,
        { failOnStatusCode: false, maxRedirects: 0 }
      );
      expectStatusExact(contractDataResponse, 200, "Admin contract autofill should succeed");

      const contractData = (await contractDataResponse.json()) as { buildingId?: number; customerId?: number; rentArea?: number };
      expect(contractData.buildingId).toBe(scenario.buildingId);
      expect(contractData.customerId).toBe(scenario.customerId);
      expect(typeof contractData.rentArea).toBe("number");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-004 returns sale contract autofill for BUY request", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "BUY");
    try {
      const response = await scenario.admin.get(
        `/api/v1/admin/property-requests/${scenario.propertyRequestId}/sale-contract-data`,
        { failOnStatusCode: false, maxRedirects: 0 }
      );
      expectStatusExact(response, 200, "Admin sale contract autofill should succeed");

      const payload = (await response.json()) as { buildingId?: number; customerId?: number; salePrice?: number };
      expect(payload.buildingId).toBe(scenario.buildingId);
      expect(payload.customerId).toBe(scenario.customerId);
      expect(typeof payload.salePrice).toBe("number");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-005 rejects a pending request and updates detail status", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const rejectResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/reject`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: { reason: "Contract data mismatch" }
      });
      const message = await expectMessageBody(rejectResponse, 200);
      expect(message.length).toBeGreaterThan(0);

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(detailResponse, 200, "Admin property request detail after reject should succeed");

      const detail = (await detailResponse.json()) as { status?: string; adminNote?: string };
      expect(detail.status).toBe("REJECTED");
      expect(detail.adminNote).toBe("Contract data mismatch");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-006 approves a pending request and exposes pending-count endpoint", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "BUY");
    try {
      const approveResponse = await scenario.admin.post(`/api/v1/admin/property-requests/${scenario.propertyRequestId}/approve`, {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: {}
      });
      const message = await expectMessageBody(approveResponse, 200);
      expect(message.length).toBeGreaterThan(0);

      const detailResponse = await scenario.admin.get(`/api/v1/admin/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(detailResponse, 200, "Admin property request detail after approve should succeed");

      const detail = (await detailResponse.json()) as { status?: string };
      expect(detail.status).toBe("APPROVED");

      const pendingResponse = await scenario.admin.get("/api/v1/admin/property-requests/pending-count", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(pendingResponse, 200, "Admin property request pending-count should succeed");

      const pendingCount = Number(await pendingResponse.text());
      expect(pendingCount).toBeGreaterThanOrEqual(0);
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-ADM-PRQ-007 returns 409 for missing request id", async ({ playwright }) => {
    const admin = await createRoleContext(playwright, "admin");
    try {
      const response = await admin.get("/api/v1/admin/property-requests/999999999", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const message = await expectMessageBody(response, 409);
      expect(message.length).toBeGreaterThan(0);
    } finally {
      await admin.dispose();
    }
  });
});
