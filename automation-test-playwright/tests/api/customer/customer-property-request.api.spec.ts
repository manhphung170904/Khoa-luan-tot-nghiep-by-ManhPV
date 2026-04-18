import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectArrayBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { createAnonymousContext } from "@api/adminApiUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { createPropertyRequestScenario } from "../_fixtures/propertyRequestScenario";

test.describe("Customer Property Request API @regression", () => {
  test.afterAll(async () => {
    await MySqlDbClient.close();
  });

  test("API-CUS-PRQ-001 rejects anonymous submit with API auth status", async ({ playwright }) => {
    const context = await createAnonymousContext(playwright);
    try {
      const response = await context.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload()
      });

      await expectApiErrorBody(response, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/customer/property-requests"
      });
    } finally {
      await context.dispose();
    }
  });

  test("API-CUS-PRQ-002 validates required buildingId", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const response = await scenario.customer.post("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0,
        data: TestDataFactory.buildPropertyRequestPayload({ buildingId: null }, "RENT")
      });

      await expectApiErrorBody(response, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/customer/property-requests"
      });
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-CUS-PRQ-003 submits and lists a RENT property request", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const listResponse = await scenario.customer.get("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const payload = await expectArrayBody<{
        id: number;
        buildingName?: string;
        status?: string;
        requestType?: string;
      }>(listResponse, 200);
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

      const errorBody = await expectApiErrorBody<{ message?: string }>(duplicateResponse, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/customer/property-requests"
      });
      expect(errorBody.message).toMatch(/Đã tồn tại|yêu cầu|đang chờ xử lý|pending|ton tai|yeu cau/i);

      const duplicateRows = await MySqlDbClient.query<{ count: number }>(
        `
          SELECT COUNT(*) AS count
          FROM property_request
          WHERE customer_id = ? AND building_id = ? AND status = ?
        `,
        [scenario.customerId, scenario.buildingId, "PENDING"]
      );
      expect(Number(duplicateRows[0]?.count ?? 0)).toBe(1);
    } finally {
      await scenario.cleanup();
    }
  });

  test("API-CUS-PRQ-005 cancels own pending request", async ({ playwright }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT");
    try {
      const cancelResponse = await scenario.customer.delete(`/api/v1/customer/property-requests/${scenario.propertyRequestId}`, {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      await expectApiMessage(cancelResponse, {
        status: 200,
        message: apiExpectedMessages.customer.propertyRequests.delete,
        dataMode: "null"
      });

      const listResponse = await scenario.customer.get("/api/v1/customer/property-requests", {
        failOnStatusCode: false,
        maxRedirects: 0
      });
      const payload = await expectArrayBody<{ id: number; status?: string }>(listResponse, 200);
      const cancelledRequest = payload.find((item) => item.id === scenario.propertyRequestId);
      expect(cancelledRequest?.status).toBe("CANCELLED");
    } finally {
      await scenario.cleanup();
    }
  });
});



