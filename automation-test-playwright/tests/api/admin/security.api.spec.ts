import { expect, test } from "@fixtures/api.fixture";
import { adminEndpointCatalog } from "@api/adminEndpointCatalog";
import { createAnonymousContext, sendRequest } from "@api/adminApiUtils";
import { expectApiErrorBody, expectStatusExact } from "@api/apiContractUtils";

test.describe("ADMIN API Security Matrix @regression", () => {
  test.describe.configure({ mode: "serial" });

  const expectSecurityBodyIfJson = async (response: Awaited<ReturnType<typeof sendRequest>>, status: 401 | 403) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("application/json")) {
      expectStatusExact(response, status, "Security response must return expected status");
      expect(response.status()).not.toBe(200);
      return;
    }

    await expectApiErrorBody(response, {
      status,
      code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN"
    });
  };

  for (const endpoint of adminEndpointCatalog) {
    test(`${endpoint.id} rejects unauthenticated access @smoke`, async ({ anonymousApi }) => {
      const response = await sendRequest(anonymousApi, endpoint);
      await expectSecurityBodyIfJson(response, 401);
    });

    test(`${endpoint.id} rejects invalid session`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright, true);
      try {
        const response = await sendRequest(context, endpoint);
        await expectSecurityBodyIfJson(response, 401);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects staff role`, async ({ staffApi }) => {
      const response = await sendRequest(staffApi, endpoint);
      await expectSecurityBodyIfJson(response, 403);
    });

    test(`${endpoint.id} rejects customer role`, async ({ customerApi }) => {
      const response = await sendRequest(customerApi, endpoint);
      await expectSecurityBodyIfJson(response, 403);
    });
  }
});



