import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";
import type { ApiPayload, ApiQueryParamValue, ApiQueryParams } from "./ApiClientTypes";

export class AdminBuildingApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  create(payload: ApiPayload): Promise<APIResponse> {
    return this.post("/api/v1/admin/buildings", { data: payload });
  }

  update(buildingId: number, payload: ApiPayload): Promise<APIResponse> {
    return this.put(`/api/v1/admin/buildings/${buildingId}`, { data: payload });
  }

  deleteById(buildingId: number): Promise<APIResponse> {
    return this.delete(`/api/v1/admin/buildings/${buildingId}`);
  }

  metadata(): Promise<APIResponse> {
    return this.get("/api/v1/admin/buildings/metadata");
  }

  uploadImage(multipart: NonNullable<Parameters<APIRequestContext["post"]>[1]>["multipart"]): Promise<APIResponse> {
    return this.post("/api/v1/admin/buildings/image", { multipart });
  }

  list(params: ApiQueryParams = {}): Promise<APIResponse> {
    const normalizedParams = Object.fromEntries(
      Object.entries(params).filter((entry): entry is [string, ApiQueryParamValue] => entry[1] !== undefined)
    );
    return this.get("/api/v1/admin/buildings", { params: normalizedParams });
  }
}
