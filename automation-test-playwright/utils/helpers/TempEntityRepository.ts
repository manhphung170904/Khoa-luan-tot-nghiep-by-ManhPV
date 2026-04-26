import { expect, type APIResponse } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import type { PaginatedList } from "./TempEntityTypes";

export class TempEntityRepository {
  static async json<T>(response: APIResponse): Promise<T> {
    expect(response.ok(), `API tra ve status ${response.status()} thay vi 2xx`).toBeTruthy();
    return response.json() as Promise<T>;
  }

  static listContent<T>(data: PaginatedList<T> | T[]): T[] {
    if (Array.isArray(data)) {
      return data;
    }

    return Array.isArray(data.content) ? data.content : [];
  }

  static async emailForId(table: "staff" | "customer", id: number): Promise<string | undefined> {
    const rows = await MySqlDbClient.query<{ email: string | null }>(
      `SELECT email FROM ${table} WHERE id = ? LIMIT 1`,
      [id]
    );

    const email = rows[0]?.email?.trim();
    return email ? email : undefined;
  }

  static async customerIdByUsername(username: string): Promise<number> {
    const rows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM customer WHERE username = ? LIMIT 1",
      [username]
    );

    expect(rows.length).toBeGreaterThan(0);
    return rows[0]!.id;
  }

  static async saleContractIdByParties(buildingId: number, customerId: number, staffId: number): Promise<number> {
    const rows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM sale_contract
        WHERE building_id = ? AND customer_id = ? AND staff_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [buildingId, customerId, staffId]
    );

    const saleContract = rows[0];
    expect(saleContract?.id, "Khong tim thay id cua sale contract vua tao").toBeTruthy();
    return Number(saleContract!.id);
  }
}
