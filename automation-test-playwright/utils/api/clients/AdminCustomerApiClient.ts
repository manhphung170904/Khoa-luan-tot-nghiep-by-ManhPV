import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";

export class AdminCustomerApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  create(payload: Record<string, unknown>): Promise<APIResponse> {
    return this.post("/api/v1/admin/customers", { data: payload });
  }

  update(customerId: number, payload: Record<string, unknown>): Promise<APIResponse> {
    return this.put(`/api/v1/admin/customers/${customerId}`, { data: payload });
  }

  deleteById(customerId: number): Promise<APIResponse> {
    return this.delete(`/api/v1/admin/customers/${customerId}`);
  }
}
