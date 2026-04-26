import type { APIRequestContext } from "@playwright/test";
import { cleanupDatabaseScope, type CleanupScope } from "@db/TestDataCleanup";

export class TempEntityCleanupService {
  static async safe(action: () => Promise<unknown>, label?: string): Promise<void> {
    try {
      await action();
    } catch (error) {
      if (label) {
        console.warn(`[Cleanup Warning] ${label} failed:`, error instanceof Error ? error.message : error);
      }
    }
  }

  static async deleteWithFallback(
    request: APIRequestContext,
    url: string,
    acceptedStatuses: number[],
    fallbackScope: CleanupScope
  ): Promise<void> {
    const response = await request.delete(url, { failOnStatusCode: false });
    if (acceptedStatuses.includes(response.status())) {
      return;
    }

    await cleanupDatabaseScope(fallbackScope);
  }
}
