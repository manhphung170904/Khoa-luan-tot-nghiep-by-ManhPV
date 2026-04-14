import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";

export class ApiHelper {
  static async expectOk(response: APIResponse): Promise<void> {
    expect(response.ok()).toBeTruthy();
  }

  static async getJson<T>(request: APIRequestContext, url: string): Promise<T> {
    const response = await request.get(url);
    await this.expectOk(response);
    return (await response.json()) as T;
  }
}
