import type { APIRequestContext } from "@playwright/test";
import { env } from "@config/env";
import { ApiOtpHelper } from "@api/apiOtpHelper";

type OtpHookPayload = {
  email?: string;
  purpose?: string;
  otp?: string;
  status?: string;
};

export class ApiOtpAccessHelper {
  private static readonly fallbackPinnedOtp = "246810";
  private static readonly pollingIntervalMs = 250;

  private static hookPath(email: string, purpose: string): string {
    const params = new URLSearchParams({
      email: email.trim().toLowerCase(),
      purpose
    });
    return `/api/test-support/otp/latest?${params.toString()}`;
  }

  private static hookHeaders(): Record<string, string> {
    return env.testSupportOtpToken
      ? {
          "X-Test-Hook-Token": env.testSupportOtpToken
        }
      : {};
  }

  static async latestOtp(context: APIRequestContext, email: string, purpose: string): Promise<string> {
    const deadline = Date.now() + env.expectTimeout;

    while (Date.now() <= deadline) {
      if (env.testSupportOtpToken) {
        const response = await context.get(this.hookPath(email, purpose), {
          failOnStatusCode: false,
          headers: this.hookHeaders()
        });

        if (response.status() === 200) {
          try {
            const body = (await response.json()) as OtpHookPayload;
            if (body.otp) {
              return body.otp;
            }
          } catch {
            // Some environments may return an HTML error page behind the same status.
            // Fall through to DB pinning so API tests stay deterministic.
          }
        }
      }

      const latest = await ApiOtpHelper.latest(email, purpose);
      if (latest) {
        await ApiOtpHelper.setLatestPendingOtp(email, purpose, this.fallbackPinnedOtp);
        return this.fallbackPinnedOtp;
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollingIntervalMs));
    }

    throw new Error(
      `Khong doc duoc OTP qua test hook va cung khong tim thay OTP trong DB cho ${email}/${purpose}.`
    );
  }

  static async expireLatestOtp(context: APIRequestContext, email: string, purpose: string): Promise<void> {
    if (env.testSupportOtpToken) {
      const params = new URLSearchParams({
        email: email.trim().toLowerCase(),
        purpose
      });
      const response = await context.post(`/api/test-support/otp/expire?${params.toString()}`, {
        failOnStatusCode: false,
        headers: this.hookHeaders()
      });

      if (response.status() === 200) {
        return;
      }
    }

    await ApiOtpHelper.expireLatestPendingOtp(email, purpose);
  }
}
