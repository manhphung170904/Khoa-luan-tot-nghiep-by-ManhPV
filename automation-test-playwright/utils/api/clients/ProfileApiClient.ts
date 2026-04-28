import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";

export class ProfileApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  getCurrentProfile(): Promise<APIResponse> {
    return this.get("/api/v1/profile");
  }

  requestUsernameOtp(newUsername: string): Promise<APIResponse> {
    return this.post("/api/v1/profile/username/send-otp", { data: { newUsername } });
  }

  requestPhoneOtp(newPhoneNumber: string): Promise<APIResponse> {
    return this.post("/api/v1/profile/phone/send-otp", { data: { newPhoneNumber } });
  }
}
