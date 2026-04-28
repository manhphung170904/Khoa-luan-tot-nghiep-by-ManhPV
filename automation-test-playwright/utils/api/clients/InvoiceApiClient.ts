import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";

export class InvoiceApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  createAsAdmin(payload: Record<string, unknown>): Promise<APIResponse> {
    return this.post("/api/v1/admin/invoices", { data: payload });
  }

  updateAsAdmin(invoiceId: number, payload: Record<string, unknown>): Promise<APIResponse> {
    return this.put(`/api/v1/admin/invoices/${invoiceId}`, { data: payload });
  }

  deleteAsAdmin(invoiceId: number): Promise<APIResponse> {
    return this.delete(`/api/v1/admin/invoices/${invoiceId}`);
  }

  listCustomerInvoices(): Promise<APIResponse> {
    return this.get("/api/v1/customer/invoices");
  }
}
