import mysql, { type Pool, type PoolOptions, type ResultSetHeader } from "mysql2/promise";
import { env } from "@config/env";

type JdbcParts = {
  host: string;
  port: number;
  database: string;
};

const parseJdbcUrl = (jdbcUrl: string): JdbcParts => {
  const normalized = jdbcUrl.replace(/^jdbc:/, "");
  const parsed = new URL(normalized);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    database: parsed.pathname.replace(/^\//, "")
  };
};

export class MySqlDbClient {
  private static pool: Pool | undefined;

  private static getPool(): Pool {
    if (!this.pool) {
      const jdbc = parseJdbcUrl(env.dbJdbcUrl);
      const options: PoolOptions = {
        host: jdbc.host,
        port: jdbc.port,
        database: jdbc.database,
        user: env.dbUsername,
        password: env.dbPassword,
        waitForConnections: true,
        connectionLimit: env.dbPoolLimit,
        namedPlaceholders: false,
        decimalNumbers: true
      };

      this.pool = mysql.createPool(options);
    }

    return this.pool;
  }

  static async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.getPool().query(sql, params);
    return rows as T[];
  }

  static async execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
    const [result] = await this.getPool().execute<ResultSetHeader>(sql, params);
    return result;
  }

  static async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = undefined;
  }
}
