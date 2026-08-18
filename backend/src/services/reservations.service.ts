import { query, withTransaction } from '../config/db';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { RoleType } from '../types/auth';
import { isEventExpired, normalizeRoomIds } from './events.service';

/**
 * Decide which room a reservation belongs to.
 */
export function resolveReservationRoom(
  eventRoomIds: string[],
  primaryRoomId: string,
  requestedRoomId?: string | null
): string {
  const resolved = requestedRoomId && requestedRoomId.length > 0 ? requestedRoomId : primaryRoomId;
  if (!eventRoomIds.includes(resolved)) {
    throw new Error('Selected room is not part of this event');
  }
  return resolved;
}

class NotFoundOrForbiddenError extends Error {
  statusCode = 403;
  constructor(msg = 'Resource not found or access denied') {
    super(msg);
  }
}

export const ReservationsService = {
  async getEventOccupancy(eventId: string, userRole: RoleType, clientId?: string): Promise<any> {
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      const eventRes = await query(`SELECT id FROM events WHERE id = $1 AND client_id = $2`, [eventId, clientId]);
      if (eventRes.rows.length === 0) throw new NotFoundOrForbiddenError('Event not found or access denied');
    }

    const tablesRes = await query(`SELECT * FROM tables WHERE event_id = $1 ORDER BY table_number ASC`, [eventId]);
    const chairsRes = await query(
      `SELECT chairs.*, 
              r.id as reservation_id, r.status as reservation_status, 
              r.room_id as reservation_room_id,
              i.name as invitee_name, i.email as invitee_email,
              t.id as ticket_id, t.status as ticket_status
       FROM chairs 
       JOIN tables ON chairs.table_id = tables.id 
       LEFT JOIN reservations r ON r.chair_id = chairs.id AND r.event_id = $1 AND r.status = 'ACTIVE'
       LEFT JOIN invitees i ON r.invitee_id = i.id
       LEFT JOIN tickets t ON t.reservation_id = r.id
        WHERE tables.event_id = $1
        ORDER BY COALESCE(NULLIF(chairs.chair_number, '')::integer, 999999), chairs.chair_number ASC`,
      [eventId]
    );
    const chairs = chairsRes.rows;
    const tables = tablesRes.rows.map(table => ({
      ...table,
      chairs: chairs.filter(chair => chair.table_id === table.id)
    }));
    return { tables };
  },

  async createReservationAndTicket(
    eventId: string,
    tableId: string,
    chairId: string,
    invitee: { name: string, email?: string, phone?: string },
    roomId?: string | null,
    userRole?: RoleType,
    clientId?: string,
    type: 'SINGLE' | 'COUPLE' = 'SINGLE',
    pairedChairId?: string
  ) {
    return await withTransaction(async (client) => {
      let sql = `SELECT room_id, room_ids, end_time FROM events WHERE id = $1`;
      const params: any[] = [eventId];
       
      if (userRole === RoleType.CLIENT_ADMIN && clientId) {
        params.push(clientId);
        sql += ` AND client_id = $${params.length}`;
      }
       
      const eventRes = await client.query<{ room_id: string, room_ids: any, end_time: Date }>(sql, params);
       
      if (eventRes.rows.length === 0) {
        throw new NotFoundOrForbiddenError('Event not found or access denied');
      }
      const eventRow = eventRes.rows[0];
      if (isEventExpired(eventRow.end_time)) {
        throw new Error('This event has already finished and seating can no longer be edited.');
      }

      const eventRoomIds = normalizeRoomIds(eventRow.room_ids, eventRow.room_id);
      const resolvedRoomId = resolveReservationRoom(eventRoomIds, eventRow.room_id, roomId);

      const tableRes = await client.query<{ room_id: string }>(
        `SELECT room_id FROM tables WHERE id = $1`,
        [tableId]
      );
      if (tableRes.rows.length === 0) {
        throw new Error('Table not found');
      }
      if (tableRes.rows[0].room_id !== resolvedRoomId) {
        throw new Error('Selected room does not match the table\'s room');
      }

      // --- Couple validation: a partner seat must exist, be on the same
      // table, differ from the selected seat, and be free. ---
      if (type === 'COUPLE') {
        if (!pairedChairId) {
          throw new Error('A partner seat is required for a couple reservation.');
        }
        if (pairedChairId === chairId) {
          throw new Error('The partner seat must be different from the selected seat.');
        }
        const partnerRes = await client.query<{ id: string }>(
          `SELECT id FROM chairs WHERE id = $1 AND table_id = $2`,
          [pairedChairId, tableId]
        );
        if (partnerRes.rows.length === 0) {
          throw new Error('The partner seat is not valid for this table.');
        }
        const takenRes = await client.query<{ id: string }>(
          `SELECT id FROM reservations WHERE chair_id = $1 AND event_id = $2 AND status = 'ACTIVE'`,
          [pairedChairId, eventId]
        );
        if (takenRes.rows.length > 0) {
          throw new Error('The adjacent seat is already taken.');
        }
      }

      // Auto-stamp client_id for CLIENT_ADMIN users, leave null for SUPER_ADMIN
      const effectiveClientId = userRole === RoleType.CLIENT_ADMIN ? clientId : null;

      const inviteeRes = await client.query(
        `INSERT INTO invitees (name, email, phone, client_id) VALUES ($1, $2, $3, $4) RETURNING id`,
        [invitee.name, invitee.email || null, invitee.phone || null, effectiveClientId]
      );
      const inviteeId = inviteeRes.rows[0].id;

      const coupleGroupId = type === 'COUPLE' ? crypto.randomUUID() : null;

      const insertReservation = async (cid: string): Promise<string> => {
        const resvRes = await client.query<{ id: string }>(
          `INSERT INTO reservations (event_id, table_id, chair_id, invitee_id, room_id, reservation_type, couple_group_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [eventId, tableId, cid, inviteeId, resolvedRoomId, type, coupleGroupId]
        );
        return resvRes.rows[0].id;
      };

      let reservationId;
      try {
        reservationId = await insertReservation(chairId);
        if (type === 'COUPLE' && pairedChairId) {
          await insertReservation(pairedChairId);
        }
      } catch (err: any) {
        if (err.code === '23505') {
          throw new Error('This chair is already reserved for this event.');
        }
        throw err;
      }
      const qrToken = crypto.randomUUID();
      const ticketRes = await client.query(
        `INSERT INTO tickets (reservation_id, qr_token) VALUES ($1, $2) RETURNING id`,
        [reservationId, qrToken]
      );
      const ticketId = ticketRes.rows[0].id;
      const qrDataUrl = await QRCode.toDataURL(qrToken, { errorCorrectionLevel: 'H' });
      return {
        reservationId,
        ticketId,
        qrToken,
        qrDataUrl
      };
    });
  },

  async cancelReservation(reservationId: string, userRole: RoleType, clientId?: string) {
    return await withTransaction(async (client) => {
      const resvCheck = await client.query<{ id: string; couple_group_id: string | null }>(
        `SELECT r.id, r.couple_group_id FROM reservations r
         JOIN events e ON r.event_id = e.id
         WHERE r.id = $1`,
        [reservationId]
      );
      if (resvCheck.rows.length === 0) {
        throw new NotFoundOrForbiddenError('Reservation not found or access denied');
      }
      if (userRole === RoleType.CLIENT_ADMIN && clientId) {
        const owned = await client.query(
          `SELECT 1 FROM reservations r
           JOIN events e ON r.event_id = e.id
           WHERE r.id = $1 AND e.client_id = $2`,
          [reservationId, clientId]
        );
        if (owned.rows.length === 0) {
          throw new NotFoundOrForbiddenError('Reservation not found or access denied');
        }
      }

      const groupId = resvCheck.rows[0].couple_group_id;
      const scopeSql =
        groupId !== null
          ? `id = $1 OR (couple_group_id = $2 AND couple_group_id IS NOT NULL)`
          : `id = $1`;

      await client.query(
        `UPDATE reservations SET status = 'CANCELLED', cancelled_at = NOW() WHERE ${scopeSql}`,
        groupId !== null ? [reservationId, groupId] : [reservationId]
      );
      await client.query(
        `UPDATE tickets SET status = 'CANCELLED' WHERE reservation_id IN (
           SELECT id FROM reservations WHERE ${scopeSql}
         )`,
        groupId !== null ? [reservationId, groupId] : [reservationId]
      );
    });
  }
};