import crypto from "node:crypto";
import { MySqlDbClient } from "@db/MySqlDbClient";

export type EmailVerificationRow = {
  id: number;
  email: string;
  purpose: string;
  status: string;
  expiresAt: string | Date | null;
  verifiedAt: string | Date | null;
  usedAt: string | Date | null;
};

export class ApiOtpHelper {
  static hashOtp(otp: string): string {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }

  static async latest(email: string, purpose: string): Promise<EmailVerificationRow | null> {
    const rows = await MySqlDbClient.query<EmailVerificationRow>(
      `
        SELECT
          id,
          email,
          purpose,
          status,
          expires_at AS expiresAt,
          verified_at AS verifiedAt,
          used_at AS usedAt
        FROM email_verification
        WHERE email = ? AND purpose = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [email.trim().toLowerCase(), purpose]
    );

    return rows[0] ?? null;
  }

  static async setLatestPendingOtp(email: string, purpose: string, otp: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const latest = await this.latest(normalizedEmail, purpose);
    if (!latest) {
      throw new Error(`Khong tim thay OTP cho ${normalizedEmail} / ${purpose}.`);
    }

    await MySqlDbClient.execute(
      `
        UPDATE email_verification
        SET otp_hash = ?,
            status = 'PENDING',
            expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
            verified_at = NULL,
            used_at = NULL
        WHERE id = ?
      `,
      [this.hashOtp(otp), latest.id]
    );
  }

  static async expireLatestPendingOtp(email: string, purpose: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const latest = await this.latest(normalizedEmail, purpose);
    if (!latest) {
      throw new Error(`Khong tim thay OTP cho ${normalizedEmail} / ${purpose}.`);
    }

    await MySqlDbClient.execute(
      `
        UPDATE email_verification
        SET status = 'PENDING',
            expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE),
            verified_at = NULL,
            used_at = NULL
        WHERE id = ?
      `,
      [latest.id]
    );
  }
}
