import { query } from '../config/db';
import { RoleType } from '../types/auth';

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
   * Create a building. CLIENT_ADMIN: auto-stamps their client_id.
   * SUPER_ADMIN: client_id stays null (platform-level building).
   */
  async create(name: string, address: string | undefined, userRole: RoleType, clientId?: string): Promise<BuildingRecord> {
    const effectiveClientId = userRole === RoleType.CLIENT_ADMIN ? clientId : null;
    const result = await query<BuildingRecord>(
      `INSERT INTO buildings (name, address, client_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, address ?? null, effectiveClientId],
    );
    return result.rows[0];
  },

  /**
   * List buildings. CLIENT_ADMIN: scoped to their tenant.
   * SUPER_ADMIN: returns all buildings.
   */
  async list(userRole: RoleType, clientId?: string): Promise<BuildingRecord[]> {
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
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
   * Delete a building. CLIENT_ADMIN: scoped to their tenant.
   * SUPER_ADMIN: can delete any building.
   */
  async delete(id: string, userRole: RoleType, clientId?: string): Promise<void> {
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      const result = await query(
        `DELETE FROM buildings WHERE id = $1 AND client_id = $2`,
        [id, clientId],
      );
      if (result.rowCount === 0) throw new NotFoundOrForbiddenError();
    } else {
      const result = await query(`DELETE FROM buildings WHERE id = $1`, [id]);
      if (result.rowCount === 0) throw new NotFoundOrForbiddenError();
    }
  },
};