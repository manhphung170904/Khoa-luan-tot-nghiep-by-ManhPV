import { MySqlDbClient } from "../MySqlDbClient";

export class TestDbRepository {
  static query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return MySqlDbClient.query<T>(sql, params);
  }

  static execute(sql: string, params: unknown[] = []): Promise<unknown> {
    return MySqlDbClient.execute(sql, params);
  }
}
