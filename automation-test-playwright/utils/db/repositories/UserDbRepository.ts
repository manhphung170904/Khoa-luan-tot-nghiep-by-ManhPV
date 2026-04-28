import { MySqlDbClient } from "../MySqlDbClient";

export class UserDbRepository {
  static async customerEmailByUsername(username: string): Promise<string> {
    const rows = await MySqlDbClient.query<{ email: string }>("SELECT email FROM customer WHERE username = ? LIMIT 1", [username]);
    return rows[0]?.email ?? "";
  }

  static async staffEmailByUsername(username: string): Promise<string> {
    const rows = await MySqlDbClient.query<{ email: string }>("SELECT email FROM staff WHERE username = ? LIMIT 1", [username]);
    return rows[0]?.email ?? "";
  }

  static async customerIdsByEmailOrUsername(email: string, username: string): Promise<number[]> {
    const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM customer WHERE email = ? OR username = ?", [email, username]);
    return rows.map((row) => row.id);
  }
}
