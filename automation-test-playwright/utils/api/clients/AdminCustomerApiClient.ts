import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";
import type { ApiPayload, ApiQueryParamValue, ApiQueryParams } from "./ApiClientTypes";

export class AdminCustomerApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  create(payload: ApiPayload): Promise<APIResponse> {
    return this.post("/api/v1/admin/customers", { data: payload });
  }

  update(customerId: number, payload: ApiPayload): Promise<APIResponse> {
    return this.put(`/api/v1/admin/customers/${customerId}`, { data: payload });
  }

  deleteById(customerId: number): Promise<APIResponse> {
    return this.delete(`/api/v1/admin/customers/${customerId}`);
  }

  list(params: ApiQueryParams = {}): Promise<APIResponse> {
    const normalizedParams = Object.fromEntries(
      Object.entries(params).filter((entry): entry is [string, ApiQueryParamValue] => entry[1] !== undefined)
    );
    return this.get("/api/v1/admin/customers", { params: normalizedParams });
  }
}
