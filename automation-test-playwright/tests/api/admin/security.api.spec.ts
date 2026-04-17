import { test } from "@playwright/test";
import { adminEndpointCatalog } from "@api/adminEndpointCatalog";
import { createAnonymousContext, createRoleContext, sendRequest } from "@api/adminApiUtils";
import { expectStatusExact } from "@api/apiContractUtils";

test.describe("ADMIN API Security Matrix @api @regression", () => {
  test.describe.configure({ mode: "serial" });

  for (const endpoint of adminEndpointCatalog) {
    test(`${endpoint.id} rejects unauthenticated access @smoke @regression`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright);
      try {
        const response = await sendRequest(context, endpoint);
        expectStatusExact(response, 401, `${endpoint.id} must reject anonymous admin access`);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects invalid session @regression`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright, true);
      try {
        const response = await sendRequest(context, endpoint);
        expectStatusExact(response, 401, `${endpoint.id} must reject invalid admin session`);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects staff role @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await sendRequest(context, endpoint);
        expectStatusExact(response, 403, `${endpoint.id} must reject staff role on admin endpoint`);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects customer role @regression`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "customer");
      try {
        const response = await sendRequest(context, endpoint);
        expectStatusExact(response, 403, `${endpoint.id} must reject customer role on admin endpoint`);
      } finally {
        await context.dispose();
      }
    });
  }
});
