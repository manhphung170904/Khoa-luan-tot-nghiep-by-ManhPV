import { test } from "@playwright/test";
import { adminEndpointCatalog } from "@api/adminEndpointCatalog";
import { createAnonymousContext, createRoleContext, sendRequest } from "@api/adminApiUtils";
import { expectApiErrorBody, expectStatusExact } from "@api/apiContractUtils";

test.describe("ADMIN API Security Matrix @api @regression", () => {
  test.describe.configure({ mode: "serial" });

  const expectSecurityBodyIfJson = async (response: Awaited<ReturnType<typeof sendRequest>>, status: 401 | 403) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("application/json")) {
      expectStatusExact(response, status, "Security response must return expected status");
      return;
    }

    await expectApiErrorBody(response, {
      status,
      code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN"
    });
  };

  for (const endpoint of adminEndpointCatalog) {
    test(`${endpoint.id} rejects unauthenticated access @smoke @regression`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright);
      try {
        const response = await sendRequest(context, endpoint);
        await expectSecurityBodyIfJson(response, 401);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects invalid session @regression`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright, true);
      try {
        const response = await sendRequest(context, endpoint);
        await expectSecurityBodyIfJson(response, 401);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects staff role @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await sendRequest(context, endpoint);
        await expectSecurityBodyIfJson(response, 403);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects customer role @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "customer");
      try {
        const response = await sendRequest(context, endpoint);
        await expectSecurityBodyIfJson(response, 403);
      } finally {
        await context.dispose();
      }
    });
  }
});
