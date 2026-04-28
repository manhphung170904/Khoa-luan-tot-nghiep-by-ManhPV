import type { APIRequestContext, APIResponse } from "@playwright/test";
import { BaseApiClient } from "./BaseApiClient";

export class AuthApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  login(username: string, password: string): Promise<APIResponse> {
    return this.post("/api/v1/auth/login", { data: { username, password } });
  }

  logout(): Promise<APIResponse> {
    return this.post("/api/v1/auth/logout");
  }

  me(): Promise<APIResponse> {
    return this.get("/api/v1/auth/me");
  }

  forgotPassword(email: string): Promise<APIResponse> {
    return this.post("/api/v1/auth/forgot-password", { params: { email } });
  }
}
