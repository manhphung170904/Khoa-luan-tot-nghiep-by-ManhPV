import { MySqlDbClient } from './db/MySqlDbClient';

/**
 * Adapter Class DatabaseHelper
 * Nhằm tương thích ngược code Test Script cũ trỏ sang Pool tĩnh của MySqlDbClient bên trong file db/MySqlDbClient.ts
 */
export class DatabaseHelper {
    public async connect() {
        // Hệ thống MySqlDbClient đã tự động xử lý tạo vòng pool kết nối theo cơ chế Singleton Lazy-Load
    }

    public async disconnect() {
        await MySqlDbClient.close();
    }

    public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        return await MySqlDbClient.query<T>(sql, params);
    }
}
