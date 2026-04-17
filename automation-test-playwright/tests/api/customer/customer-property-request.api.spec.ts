import { test, expect } from "@playwright/test";
import { createAnonymousContext, createRoleContext } from "@api/adminApiUtils";
import { expectMessageBody, expectStatusExact } from "@api/apiContractUtils";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { createPropertyRequestScenario } from "../_fixtures/propertyRequestScenario";

test.describe("Customer Property Request API @api @regression", () => {
  test("API-CUS-PRQ-001 rejects anonymous submit with API auth status @regression", async ({ playwright }) => {
    const context = await createAnonymousContext(playwright);
    try {
      const response = await context.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload()
      });

      expectStatusExact(response, 401, "Customer property request submit must reject anonymous access");
    } finally {
      await context.dispose();
    }
  });

  test("API-CUS-PRQ-002 validates required buildingId @regression", async ({ playwright }) => {
    const customer = await createRoleContext(playwright, "customer");
    try {
      const response = await customer.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload({ buildingId: null })
      });

      const message = await expectMessageBody(response, 400);
      expect(message.length).toBeGreaterThan(0);
    } finally {
      await customer.dispose();
    }
  });

  test("API-CUS-PRQ-003 submits and lists a RENT property request @regression", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const listResponse = await scenario.customer.get("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(listResponse, 200, "Customer property request list should succeed");

      const payload = (await listResponse.json()) as Array<{ id: number; buildingName?: string; status?: string; requestType?: string }>;
      const createdRequest = payload.find((item) => item.id === scenario.propertyRequestId);

      expect(createdRequest).toBeDefined();
      expect(createdRequest?.buildingName).toBe(scenario.buildingName);
      expect(createdRequest?.status).toBe("PENDING");
      expect(createdRequest?.requestType).toBe("RENT");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-CUS-PRQ-004 rejects duplicate pending request with 409 @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const duplicateResponse = await scenario.customer.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload({ buildingId: scenario.buildingId }, "RENT")
      });

      const message = await expectMessageBody(duplicateResponse, 409);
      expect(message.length).toBeGreaterThan(0);
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-CUS-PRQ-005 cancels own pending request @regression", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const cancelResponse = await scenario.customer.delete(`/api/v1/customer/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const message = await expectMessageBody(cancelResponse, 200);
      expect(message.length).toBeGreaterThan(0);

      const listResponse = await scenario.customer.get("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expectStatusExact(listResponse, 200, "Customer property request list after cancel should succeed");

      const payload = (await listResponse.json()) as Array<{ id: number; status?: string }>;
      const cancelledRequest = payload.find((item) => item.id === scenario.propertyRequestId);
      expect(cancelledRequest?.status).toBe("CANCELLED");
    } finally {
      await scenario.cleanup();
    }
  });
});

