import { query, withTransaction } from '../config/db';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { isEventExpired } from './events.service';
export const ReservationsService = {
  async getEventOccupancy(eventId: string): Promise<any> {
    const tablesRes = await query(`SELECT * FROM tables WHERE event_id = $1 ORDER BY table_number ASC`, [eventId]);
    const chairsRes = await query(
      `SELECT chairs.*, 
              r.id as reservation_id, r.status as reservation_status, 
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
  async createReservationAndTicket(eventId: string, tableId: string, chairId: string, invitee: { name: string, email?: string, phone?: string }) {
    return await withTransaction(async (client) => {
      const eventRes = await client.query<{ end_time: Date }>(
        `SELECT end_time FROM events WHERE id = $1`,
        [eventId]
      );
      if (eventRes.rows.length === 0) {
        throw new Error('Event not found');
      }
      if (isEventExpired(eventRes.rows[0].end_time)) {
        throw new Error('This event has already finished and seating can no longer be edited.');
      }

      const inviteeRes = await client.query(
        `INSERT INTO invitees (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
        [invitee.name, invitee.email || null, invitee.phone || null]
      );
      const inviteeId = inviteeRes.rows[0].id;
      let reservationId;
      try {
        const resvRes = await client.query(
          `INSERT INTO reservations (event_id, table_id, chair_id, invitee_id) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [eventId, tableId, chairId, inviteeId]
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