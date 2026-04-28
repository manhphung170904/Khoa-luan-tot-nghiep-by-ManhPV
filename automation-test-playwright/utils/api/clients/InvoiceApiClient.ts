import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";
import type { ApiPayload, ApiQueryParamValue, ApiQueryParams } from "./ApiClientTypes";

export class InvoiceApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  createAsAdmin(payload: ApiPayload): Promise<APIResponse> {
    return this.post("/api/v1/admin/invoices", { data: payload });
  }

  updateAsAdmin(invoiceId: number, payload: ApiPayload): Promise<APIResponse> {
    return this.put(`/api/v1/admin/invoices/${invoiceId}`, { data: payload });
  }

  deleteAsAdmin(invoiceId: number): Promise<APIResponse> {
    return this.delete(`/api/v1/admin/invoices/${invoiceId}`);
  }

  listAsAdmin(params: ApiQueryParams = {}): Promise<APIResponse> {
    const normalizedParams = Object.fromEntries(
      Object.entries(params).filter((entry): entry is [string, ApiQueryParamValue] => entry[1] !== undefined)
    );
    return this.get("/api/v1/admin/invoices", { params: normalizedParams });
  }

  confirmAsAdmin(invoiceId: number): Promise<APIResponse> {
    return this.post(`/api/v1/admin/invoices/${invoiceId}/confirm`);
  }

  updateStatusAsAdmin(): Promise<APIResponse> {
    return this.put("/api/v1/admin/invoices/status");
  }

  listCustomerInvoices(): Promise<APIResponse> {
    return this.get("/api/v1/customer/invoices");
  }
}
