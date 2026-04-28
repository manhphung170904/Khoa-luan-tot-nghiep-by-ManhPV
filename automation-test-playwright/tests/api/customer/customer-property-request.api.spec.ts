import { expect, test } from "@fixtures/api.fixture";
import { expectApiErrorBody, expectApiMessage, expectArrayBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { createAnonymousContext } from "@api/adminApiUtils";
import { TestDbRepository } from "@db/repositories";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { createPropertyRequestScenario } from "@data/propertyRequestScenario";

test.describe("Customer - API Property Request @regression @api", () => {
  test.afterAll(async () => {
  });

  test("[API-CUS-PRQ-001] - API Customer Property Request - Submission - Anonymous Access Rejection", async ({ playwright }) => {
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

  test("[API-CUS-PRQ-002] - API Customer Property Request - Building Reference - Required Field Validation", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT", cleanupRegistry);
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
  });

  test("[API-CUS-PRQ-003] - API Customer Property Request - Rent Request - Submission and Listing Flow", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT", cleanupRegistry);
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
  });

  test("[API-CUS-PRQ-004] - API Customer Property Request - Pending Request - Duplicate Submission Rejection @extended", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT", cleanupRegistry);
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
    expect(errorBody.message).toMatch(/pending|t?n t?i|yu c?u|dang ch? x? l/i);

    const duplicateRows = await TestDbRepository.query<{ count: number }>(
        `
          SELECT COUNT(*) AS count
          FROM property_request
          WHERE customer_id = ? AND building_id = ? AND status = ?
        `,
        [scenario.customerId, scenario.buildingId, "PENDING"]
    );
    expect(Number(duplicateRows[0]?.count ?? 0)).toBe(1);
  });

  test("[API-CUS-PRQ-005] - API Customer Property Request - Pending Request - Customer Cancellation", async ({ playwright, cleanupRegistry }) => {
    const scenario = await createPropertyRequestScenario(playwright, "RENT", cleanupRegistry);
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
  });
});
