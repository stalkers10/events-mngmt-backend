import { query, withTransaction } from '../config/db';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { isEventExpired, normalizeRoomIds } from './events.service';

/**
 * Decide which room a reservation belongs to.
 * - If a roomId is provided it must be part of the event, otherwise reject.
 * - If none is provided, fall back to the event's primary room.
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

export const ReservationsService = {
  async getEventOccupancy(eventId: string): Promise<any> {
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
       ORDER BY chairs.chair_number ASC`,
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
    roomId?: string | null
  ) {
    return await withTransaction(async (client) => {
      const eventRes = await client.query<{ room_id: string, room_ids: any, end_time: Date }>(
        `SELECT room_id, room_ids, end_time FROM events WHERE id = $1`,
        [eventId]
      );
      if (eventRes.rows.length === 0) {
        throw new Error('Event not found');
      }
      const eventRow = eventRes.rows[0];
      if (isEventExpired(eventRow.end_time)) {
        throw new Error('This event has already finished and seating can no longer be edited.');
      }

      const eventRoomIds = normalizeRoomIds(eventRow.room_ids, eventRow.room_id);
      const resolvedRoomId = resolveReservationRoom(eventRoomIds, eventRow.room_id, roomId);

      // The chair's table must physically belong to the room being reserved.
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

      const inviteeRes = await client.query(
        `INSERT INTO invitees (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
        [invitee.name, invitee.email || null, invitee.phone || null]
      );
      const inviteeId = inviteeRes.rows[0].id;
      let reservationId;
      try {
        const resvRes = await client.query(
          `INSERT INTO reservations (event_id, table_id, chair_id, invitee_id, room_id) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [eventId, tableId, chairId, inviteeId, resolvedRoomId]
        );
        reservationId = resvRes.rows[0].id;
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
  async cancelReservation(reservationId: string) {
    return await withTransaction(async (client) => {
      await client.query(
        `UPDATE reservations SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1`,
        [reservationId]
      );
      await client.query(
        `UPDATE tickets SET status = 'CANCELLED' WHERE reservation_id = $1`,
        [reservationId]
      );
    });
  }
};