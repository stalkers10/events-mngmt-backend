import { query } from '../config/db';

export interface BuildingRecord {
  id: string;
  name: string;
  address: string | null;
  client_id: string | null;
  created_at: Date;
}

class NotFoundOrForbiddenError extends Error {
  statusCode = 403;
  constructor() { super('Building not found or access denied'); }
}

export const BuildingsService = {
  /**
   * Create a building. clientId is set to the CLIENT_ADMIN's id,
   * or NULL if created by the SUPER_ADMIN (platform-level building).
   */
  async create(name: string, address?: string, clientId?: string): Promise<BuildingRecord> {
    const result = await query<BuildingRecord>(
      `INSERT INTO buildings (name, address, client_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, address ?? null, clientId ?? null],
    );
    return result.rows[0];
  },

  /**
   * List buildings. Pass clientId to scope to a single tenant;
   * omit (or pass undefined) to return all (SUPER_ADMIN view).
   */
  async list(clientId?: string): Promise<BuildingRecord[]> {
    if (clientId) {
      const result = await query<BuildingRecord>(
        `SELECT * FROM buildings WHERE client_id = $1 ORDER BY created_at DESC`,
        [clientId],
      );
      return result.rows;
    }
    const result = await query<BuildingRecord>(
      `SELECT * FROM buildings ORDER BY created_at DESC`,
    );
    return result.rows;
  },

  /**
   * Delete a building. When clientId is provided the delete is scoped to
   * that tenant so CLIENT_ADMIN cannot delete another client's building.
   */
  async delete(id: string, clientId?: string): Promise<void> {
    if (clientId) {
      const result = await query(
        `DELETE FROM buildings WHERE id = $1 AND client_id = $2`,
        [id, clientId],
      );
      if (result.rowCount === 0) throw new NotFoundOrForbiddenError();
    } else {
      await query(`DELETE FROM buildings WHERE id = $1`, [id]);
    }
  },
};