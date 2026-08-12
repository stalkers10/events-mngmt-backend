import bcrypt from 'bcrypt';
import { query } from '../config/db';
import { env } from '../config/env';
import { EventsService } from './events.service';

const SALT_ROUNDS = 12;

interface GateStaffRecord {
  id: string;
  username: string;
  is_active: boolean;
  created_at: Date;
  client_id: string | null;
  assignments?: { id: string; name: string }[];
}

class NotFoundOrForbiddenError extends Error {
  statusCode = 403;
  constructor(msg = 'Gate staff not found or access denied') {
    super(msg);
  }
}

export const GateStaffService = {
  async create(
    username: string,
    plainPassword: string,
    eventIds: string[] = [],
    clientId?: string
  ): Promise<{ id: string; username: string }> {
    if (username.trim().toLowerCase() === env.adminUsername.trim().toLowerCase()) {
      const err = new Error('Reserved super admin username');
      (err as any).statusCode = 409;
      throw err;
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      throw new Error('Username already taken');
    }

    // Verify all events belong to the client if clientId is provided
    if (clientId && eventIds.length > 0) {
      for (const eventId of eventIds) {
        const event = await EventsService.getById(eventId, clientId);
        if (!event) {
           const e = new Error(`Event ${eventId} not found or you do not have permission`);
           (e as any).statusCode = 403;
           throw e;
        }
      }
    }

    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    const result = await query<{ id: string; username: string }>(
      `INSERT INTO users (username, password_hash, role, is_active, client_id)
       VALUES ($1, $2, 'GATE_STAFF', true, $3)
       RETURNING id, username`,
      [username, passwordHash, clientId ?? null]
    );
    const user = result.rows[0];

    for (const eventId of eventIds) {
      await query(
        `INSERT INTO gate_staff_assignments (user_id, event_id, client_id) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, event_id) DO NOTHING`,
        [user.id, eventId, clientId ?? null]
      );
    }

    return user;
  },

  async checkOwnership(userId: string, clientId?: string): Promise<void> {
    if (clientId) {
      const res = await query(`SELECT id FROM users WHERE id = $1 AND role = 'GATE_STAFF' AND client_id = $2`, [userId, clientId]);
      if (res.rows.length === 0) {
        throw new NotFoundOrForbiddenError();
      }
    }
  },

  async deactivate(userId: string, clientId?: string): Promise<void> {
    await this.checkOwnership(userId, clientId);
    await query(
      `UPDATE users SET is_active = false WHERE id = $1 AND role = 'GATE_STAFF'`,
      [userId]
    );
  },

  async reactivate(userId: string, clientId?: string): Promise<void> {
    await this.checkOwnership(userId, clientId);
    await query(
      `UPDATE users SET is_active = true WHERE id = $1 AND role = 'GATE_STAFF'`,
      [userId]
    ); 
  },

  async list(clientId?: string): Promise<GateStaffRecord[]> {
    let sql = `
       SELECT u.id, u.username, u.is_active, u.created_at, u.client_id,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('id', e.id, 'name', e.name))
                  FROM gate_staff_assignments gsa
                  JOIN events e ON gsa.event_id = e.id
                  WHERE gsa.user_id = u.id
                ),
                '[]'::json
              ) as assignments
       FROM users u
       WHERE u.role = 'GATE_STAFF'
    `;
    const params: any[] = [];
    if (clientId) {
      params.push(clientId);
      sql += ` AND u.client_id = $${params.length}`;
    }
    sql += ` ORDER BY u.created_at DESC`;
    
    const result = await query<GateStaffRecord>(sql, params);
    return result.rows;
  },

  async assignToEvent(userId: string, eventId: string, clientId?: string): Promise<void> {
    await this.checkOwnership(userId, clientId);
    if (clientId) {
      const event = await EventsService.getById(eventId, clientId);
      if (!event) throw new NotFoundOrForbiddenError('Event not found or access denied');
    }
    await query(
      `INSERT INTO gate_staff_assignments (user_id, event_id, client_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [userId, eventId, clientId ?? null]
    );
  },

  async removeFromEvent(userId: string, eventId: string, clientId?: string): Promise<void> {
    await this.checkOwnership(userId, clientId);
    await query(
      `DELETE FROM gate_staff_assignments WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );
  },

  async deletePermanently(userId: string, clientId?: string): Promise<void> {
    await this.checkOwnership(userId, clientId);
    await query(
      `DELETE FROM users WHERE id = $1 AND role = 'GATE_STAFF'`,
      [userId]
    );
  }
};
