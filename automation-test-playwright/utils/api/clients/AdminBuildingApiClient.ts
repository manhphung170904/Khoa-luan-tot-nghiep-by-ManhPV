import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";

export class AdminBuildingApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  create(payload: Record<string, unknown>): Promise<APIResponse> {
    return this.post("/api/v1/admin/buildings", { data: payload });
  }

  update(buildingId: number, payload: Record<string, unknown>): Promise<APIResponse> {
    return this.put(`/api/v1/admin/buildings/${buildingId}`, { data: payload });
  }

  deleteById(buildingId: number): Promise<APIResponse> {
    return this.delete(`/api/v1/admin/buildings/${buildingId}`);
  }

  list(params: Record<string, string | number | boolean | undefined> = {}): Promise<APIResponse> {
    const normalizedParams = Object.fromEntries(
      Object.entries(params).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    );
    return this.get("/api/v1/admin/buildings", { params: normalizedParams });
  }
}
