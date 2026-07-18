import bcrypt from 'bcrypt';
import { query } from '../config/db';

const SALT_ROUNDS = 12;

interface GateStaffRecord {
  id: string;
  username: string;
  is_active: boolean;
  created_at: Date;
}

export const GateStaffService = {
  /**
   * Admin creates a new Gate Staff account. Optionally assigns them to
   * one or more events immediately (GateStaffAssignment rows).
   */
  async create(
    username: string,
    plainPassword: string,
    eventIds: string[] = []
  ): Promise<{ id: string; username: string }> {
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      throw new Error('Username already taken');
    }

    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    const result = await query<{ id: string; username: string }>(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES ($1, $2, 'GATE_STAFF', true)
       RETURNING id, username`,
      [username, passwordHash]
    );
    const user = result.rows[0];

    for (const eventId of eventIds) {
      await query(
        `INSERT INTO gate_staff_assignments (user_id, event_id) VALUES ($1, $2)
         ON CONFLICT (user_id, event_id) DO NOTHING`,
        [user.id, eventId]
      );
    }

    return user;
  },

  /** Soft-delete: sets isActive = false rather than removing the row, per the spec. */
  async deactivate(userId: string): Promise<void> {
    await query(
      `UPDATE users SET is_active = false WHERE id = $1 AND role = 'GATE_STAFF'`,
      [userId]
    );
  },

  /** Restores a previously deactivated Gate Staff account and its existing assignments. */
  async reactivate(userId: string): Promise<void> {
    await query(
      `UPDATE users SET is_active = true WHERE id = $1 AND role = 'GATE_STAFF'`,
      [userId]
    ); 
  },

  async list(): Promise<GateStaffRecord[]> {
    const result = await query<GateStaffRecord>(
      `SELECT id, username, is_active, created_at
       FROM users
       WHERE role = 'GATE_STAFF'
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async assignToEvent(userId: string, eventId: string): Promise<void> {
    await query(
      `INSERT INTO gate_staff_assignments (user_id, event_id) VALUES ($1, $2)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [userId, eventId]
    );
  },
};
