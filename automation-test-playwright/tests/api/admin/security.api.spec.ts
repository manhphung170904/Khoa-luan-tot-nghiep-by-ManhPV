import { test } from "@playwright/test";
import { adminEndpointCatalog } from "@api/adminEndpointCatalog";
import { createAnonymousContext, createRoleContext, expectAuthFailure, sendRequest } from "@api/adminApiUtils";

test.describe("ADMIN API Security Matrix", () => {
  test.describe.configure({ mode: "serial" });

  for (const endpoint of adminEndpointCatalog) {
    test(`${endpoint.id} rejects unauthenticated access`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright);
      try {
        const response = await sendRequest(context, endpoint);
        expectAuthFailure(response);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects invalid session`, async ({ playwright }) => {
      const context = await createAnonymousContext(playwright, true);
      try {
        const response = await sendRequest(context, endpoint);
        expectAuthFailure(response);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects staff role`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "staff");
      try {
        const response = await sendRequest(context, endpoint);
        expectAuthFailure(response);
      } finally {
        await context.dispose();
      }
    });

    test(`${endpoint.id} rejects customer role`, async ({ playwright }) => {
      const context = await createRoleContext(playwright, "customer");
      try {
        const response = await sendRequest(context, endpoint);
        expectAuthFailure(response);
      } finally {
        await context.dispose();
      }
    });
  }
});
