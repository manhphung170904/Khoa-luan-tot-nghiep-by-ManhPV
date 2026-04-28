import type { APIRequestContext, APIResponse } from "@playwright/test";

export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected get(path: string, options: Parameters<APIRequestContext["get"]>[1] = {}): Promise<APIResponse> {
    return this.request.get(path, { failOnStatusCode: false, ...options });
  }

  protected post(path: string, options: Parameters<APIRequestContext["post"]>[1] = {}): Promise<APIResponse> {
    return this.request.post(path, { failOnStatusCode: false, ...options });
  }

  protected put(path: string, options: Parameters<APIRequestContext["put"]>[1] = {}): Promise<APIResponse> {
    return this.request.put(path, { failOnStatusCode: false, ...options });
  }

  protected delete(path: string, options: Parameters<APIRequestContext["delete"]>[1] = {}): Promise<APIResponse> {
    return this.request.delete(path, { failOnStatusCode: false, ...options });
  }
}
