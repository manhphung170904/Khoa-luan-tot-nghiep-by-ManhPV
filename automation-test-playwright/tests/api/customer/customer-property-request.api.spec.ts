import { expect, test } from "@playwright/test";
import { createAnonymousContext } from "@api/adminApiUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { createPropertyRequestScenario } from "../_fixtures/propertyRequestScenario";

test.describe("Customer Property Request API @api @regression", () => {
  test.afterAll(async () => {
    await MySqlDbClient.close();
  });

  test("API-CUS-PRQ-001 rejects anonymous submit with API auth status @regression", async ({ playwright }) => {
    const context = await createAnonymousContext(playwright);
    try {
      const response = await context.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload()
      });

      expect(response.status()).toBe(401);
    } finally {
      await context.dispose();
    }
  });

  test("API-CUS-PRQ-002 validates required buildingId @regression", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const response = await scenario.customer.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload({ buildingId: null }, "RENT")
      });

      expect(response.status()).toBe(400);
      const body = (await response.json()) as { message?: string };
      expect(body.message).toBeTruthy();
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-CUS-PRQ-003 submits and lists a RENT property request @regression", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const listResponse = await scenario.customer.get("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(listResponse.status()).toBe(200);

      const payload = (await listResponse.json()) as Array<{
        id: number;
        buildingName?: string;
        status?: string;
        requestType?: string;
      }>;
      const createdRequest = payload.find((item) => item.id === scenario.propertyRequestId);

      expect(createdRequest).toBeDefined();
      expect(createdRequest?.buildingName).toBe(scenario.buildingName);
      expect(createdRequest?.status).toBe("PENDING");
      expect(createdRequest?.requestType).toBe("RENT");
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-CUS-PRQ-004 rejects duplicate pending request with business validation @extended", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const duplicateResponse = await scenario.customer.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload({ buildingId: scenario.buildingId }, "RENT")
      });

      expect(duplicateResponse.status()).toBe(400);
      const body = (await duplicateResponse.json()) as { message?: string };
      expect(body.message).toBeTruthy();
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
      expect(cancelResponse.status()).toBe(200);

      const listResponse = await scenario.customer.get("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      expect(listResponse.status()).toBe(200);

      const payload = (await listResponse.json()) as Array<{ id: number; status?: string }>;
      const cancelledRequest = payload.find((item) => item.id === scenario.propertyRequestId);
      expect(cancelledRequest?.status).toBe("CANCELLED");
    } finally {
      await scenario.cleanup();
    }
  });
});
