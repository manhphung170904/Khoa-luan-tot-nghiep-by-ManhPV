import { MySqlDbClient } from "../MySqlDbClient";

export type BuildingRecord = {
  id: number;
  name?: string;
  property_type?: string;
  transaction_type?: string;
};

export class BuildingDbRepository {
  static async findLatestByName<T extends BuildingRecord = BuildingRecord>(name: string): Promise<T | null> {
    const rows = await MySqlDbClient.query<T>("SELECT * FROM building WHERE name = ? ORDER BY id DESC LIMIT 1", [name]);
    return rows[0] ?? null;
  }

  static async exists(buildingId: number): Promise<boolean> {
    const rows = await MySqlDbClient.query<{ total: number }>("SELECT COUNT(*) AS total FROM building WHERE id = ?", [buildingId]);
    return Number(rows[0]?.total ?? 0) > 0;
  }

  static async idsMatchingWard(ward: string): Promise<number[]> {
    const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM building WHERE LOWER(ward) LIKE ?", [`%${ward.toLowerCase()}%`]);
    return rows.map((row) => row.id);
  }
}
