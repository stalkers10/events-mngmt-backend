import { query } from '../config/db';
export interface BuildingRecord {
  id: string;
  name: string;
  address: string | null;
  created_at: Date;
}   
export const BuildingsService = {
  async create(name: string, address?: string): Promise<BuildingRecord> {
    const result = await query<BuildingRecord>(
      `INSERT INTO buildings (name, address) VALUES ($1, $2) RETURNING *`,
      [name, address || null]
    );
    return result.rows[0];
  },
  async list(): Promise<BuildingRecord[]> {
    const result = await query<BuildingRecord>(
      `SELECT * FROM buildings ORDER BY created_at DESC`
    );
    return result.rows;
  },
  async delete(id: string): Promise<void> {
    await query(
      `DELETE FROM buildings WHERE id = $1`,
      [id]
    );
  }
};