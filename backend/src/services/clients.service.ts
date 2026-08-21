import bcrypt from 'bcrypt';
import { query } from '../config/db';
import { SubscriptionsService } from './subscriptions.service';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

export interface ClientRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  plan_code: string;
  subscription_status: string;
}

export const ClientsService = {
  /** Super Admin: list all Client Admin accounts (with their plan/status) */
  async list(): Promise<ClientRecord[]> {
    const result = await query<ClientRecord>(
      `SELECT u.id, u.username, u.name, u.email, u.phone, u.is_active, u.created_at,
              COALESCE(s.plan_code, 'FREE') as plan_code,
              COALESCE(s.status, 'FREE') as subscription_status
       FROM users u
       LEFT JOIN subscriptions s ON s.client_id = u.id
       WHERE u.role = 'CLIENT_ADMIN'
       ORDER BY u.created_at DESC`,
    );
    return result.rows;
  },

  /** Super Admin: create a new Client Admin account */
  async create(
    username: string,
    plainPassword: string,
    name: string,
    email: string,
    phone?: string,
  ): Promise<ClientRecord> {
    // Reserved Super Admin username
    if (username.trim().toLowerCase() === env.adminUsername.trim().toLowerCase()) {
      const err = new Error('Reserved super admin username');
      (err as any).statusCode = 409;
      throw err;
    }

    // Username uniqueness
    const existing = await query(
      `SELECT id FROM users WHERE username = $1`,
      [username],
    );
    if (existing.rows.length > 0) {
      throw new Error('Username already taken');
    }

    // Email uniqueness among CLIENT_ADMIN accounts
    const emailExists = await query(
      `SELECT id FROM users WHERE email = $1 AND role = 'CLIENT_ADMIN'`,
      [email],
    );
    if (emailExists.rows.length > 0) {
      throw new Error('A client account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    const result = await query<ClientRecord>(
      `INSERT INTO users (username, password_hash, role, is_active, name, email, phone)
       VALUES ($1, $2, 'CLIENT_ADMIN', true, $3, $4, $5)
       RETURNING id, username, name, email, phone, is_active, created_at`,
      [username, passwordHash, name, email, phone ?? null],
    );

    const client = result.rows[0];
    // New tenants always start with an explicit Free subscription. The
    // migration backfills pre-existing Client Admin accounts.
    await SubscriptionsService.ensureFreeSubscription(client.id);
    return client;
  },

  /** Super Admin: soft-delete (deactivate) a client — blocks their login */
  async deactivate(clientId: string): Promise<void> {
    await query(
      `UPDATE users SET is_active = false WHERE id = $1 AND role = 'CLIENT_ADMIN'`,
      [clientId],
    );
  },

  /** Super Admin: reactivate a previously deactivated client */
  async reactivate(clientId: string): Promise<void> {
    await query(
      `UPDATE users SET is_active = true WHERE id = $1 AND role = 'CLIENT_ADMIN'`,
      [clientId],
    );
  },

  /**
   * Super Admin: permanently delete a client and ALL their data.
   * CASCADE is handled by the DB (buildings → rooms, events, staff, etc.)
   * because client_id has ON DELETE CASCADE on every child table.
   */
  async deletePermanently(clientId: string): Promise<void> {
    // Gate staff belonging to this client have client_id = clientId;
    // they cascade-delete from users via the client_id FK.
    // Buildings → Rooms, Events → Reservations/Tickets all cascade similarly.
    await query(
      `DELETE FROM users WHERE id = $1 AND role = 'CLIENT_ADMIN'`,
      [clientId],
    );
  },

  /** Super Admin: update a client's profile details (optionally reset password) */
  async update(
    clientId: string,
    name: string,
    email: string,
    phone?: string,
    password?: string,
  ): Promise<ClientRecord> {
    if (password) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = await query<ClientRecord>(
        `UPDATE users
         SET name = $1, email = $2, phone = $3, password_hash = $4
         WHERE id = $5 AND role = 'CLIENT_ADMIN'
         RETURNING id, username, name, email, phone, is_active, created_at`,
        [name, email, phone ?? null, passwordHash, clientId],
      );
      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }
      return result.rows[0];
    }

    const result = await query<ClientRecord>(
      `UPDATE users
       SET name = $1, email = $2, phone = $3
       WHERE id = $4 AND role = 'CLIENT_ADMIN'
       RETURNING id, username, name, email, phone, is_active, created_at`,
      [name, email, phone ?? null, clientId],
    );
    if (result.rows.length === 0) {
      throw new Error('Client not found');
    }
    return result.rows[0];
  },
};
