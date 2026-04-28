import { MySqlDbClient } from "../MySqlDbClient";

export class OtpDbRepository {
  static async latestVerificationId(email: string, purpose: string): Promise<number> {
    const rows = await MySqlDbClient.query<{ maxId: number | null }>(
      "SELECT COALESCE(MAX(id), 0) AS maxId FROM email_verification WHERE email = ? AND purpose = ?",
      [email.trim().toLowerCase(), purpose]
    );
    return Number(rows[0]?.maxId ?? 0);
  }

  static async deleteVerificationsAfter(email: string, purpose: string, minId: number): Promise<void> {
    await MySqlDbClient.execute("DELETE FROM email_verification WHERE email = ? AND purpose = ? AND id > ?", [
      email.trim().toLowerCase(),
      purpose,
      minId
    ]);
  }

  static async latestStatus(email: string, purpose: string): Promise<string> {
    const rows = await MySqlDbClient.query<{ status: string }>(
      "SELECT status FROM email_verification WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1",
      [email.trim().toLowerCase(), purpose]
    );
    return rows[0]?.status ?? "";
  }
}
