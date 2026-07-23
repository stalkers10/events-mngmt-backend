import { query } from '../config/db';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
export interface TicketDetails {
  id: string;
  reservation_id: string;
  qr_token: string;
  status: string;
  issued_at: Date;
  checked_in_at: Date | null;
  // joined info
  event_id: string;
  event_name: string;
  start_time: Date;
  invitee_name: string;
  room_number: string;
  floor_number: number;
  table_number: string;
  chair_number: string;
}

export interface ScanResult {
  success: boolean;
  message: string;
  details?: TicketDetails;
}
export const TicketsService = {
  async getDetailsByReservation(reservationId: string): Promise<TicketDetails | null> {
    const res = await query<TicketDetails>(
      `SELECT t.*, 
              e.id as event_id, e.name as event_name, e.start_time, 
              i.name as invitee_name, 
              rm.room_number, rm.floor_number, 
              tb.table_number,
              ch.chair_number
       FROM tickets t
       JOIN reservations r ON t.reservation_id = r.id
       JOIN events e ON r.event_id = e.id
       JOIN invitees i ON r.invitee_id = i.id
       JOIN chairs ch ON r.chair_id = ch.id
       JOIN tables tb ON r.table_id = tb.id
       JOIN rooms rm ON e.room_id = rm.id
       WHERE t.reservation_id = $1`,
      [reservationId]
    );
    return res.rows.length ? res.rows[0] : null;
  },
  async getDetailsById(ticketId: string): Promise<TicketDetails | null> {
    const res = await query<TicketDetails>(
      `SELECT t.*, 
              e.id as event_id, e.name as event_name, e.start_time, 
              i.name as invitee_name, 
              rm.room_number, rm.floor_number,
              tb.table_number,
              ch.chair_number
       FROM tickets t
       JOIN reservations r ON t.reservation_id = r.id
       JOIN events e ON r.event_id = e.id
       JOIN invitees i ON r.invitee_id = i.id
       JOIN chairs ch ON r.chair_id = ch.id
       JOIN tables tb ON r.table_id = tb.id
       JOIN rooms rm ON e.room_id = rm.id
       WHERE t.id = $1`,
      [ticketId]
    );
    return res.rows.length ? res.rows[0] : null;
  },
  async generatePdf(ticketId: string): Promise<Buffer> {
    const details = await this.getDetailsById(ticketId);
    if (!details) throw new Error('Ticket not found');
    const qrBuffer = await QRCode.toBuffer(details.qr_token, { errorCorrectionLevel: 'H', width: 200 });
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 80 });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('Elite Events Ticket', { align: 'center' });
        doc.moveDown();
        // Event info
        doc.fontSize(18).text(details.event_name, { align: 'center' });
        doc.fontSize(14).font('Helvetica').text(new Date(details.start_time).toLocaleString(), { align: 'center' });
        doc.moveDown(2);
        // Guest info
        doc.fontSize(16).text(`Guest: ${details.invitee_name}`);
        doc.text(`Room: ${details.room_number} (Floor ${details.floor_number})`);
        doc.text(`Table: ${details.table_number}`);
        doc.text(`Chair: ${details.chair_number}`);
        doc.moveDown(2);
        // QR Code
        doc.image(qrBuffer, (doc.page.width - 200) / 2, doc.y, { width: 200 });
        doc.moveDown(1);
        doc.fontSize(10).fillColor('grey').text(`Ticket ID: ${details.id}`, { align: 'center' });
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },
  async scanTicket(qrToken: string, gateStaffUserId: string): Promise<{ success: boolean; message: string; details?: TicketDetails }> {
    const res = await query<TicketDetails>(
      `SELECT t.*, 
              e.id as event_id, e.name as event_name, e.start_time, 
              i.name as invitee_name, 
              rm.room_number, rm.floor_number,
              tb.table_number,
              ch.chair_number
       FROM tickets t
       JOIN reservations r ON t.reservation_id = r.id
       JOIN events e ON r.event_id = e.id
       JOIN invitees i ON r.invitee_id = i.id
       JOIN chairs ch ON r.chair_id = ch.id
       JOIN tables tb ON r.table_id = tb.id
       JOIN rooms rm ON e.room_id = rm.id
       WHERE t.qr_token = $1`,
      [qrToken]
    );
    if (res.rows.length === 0) {
      throw new Error('Invalid QR Code');
    }
    const details = res.rows[0];
    const eventId = (details as any).event_id;
    // Check gate staff assignment
    const assignmentRes = await query(
      `SELECT 1 FROM gate_staff_assignments WHERE user_id = $1 AND event_id = $2`,
      [gateStaffUserId, eventId]
    );
    if (assignmentRes.rows.length === 0) {
      throw new Error('You are not assigned to the event for this ticket');
    }
    if (details.status === 'CHECKED_IN') {
      throw new Error('Ticket already checked in');
    }
    if (details.status === 'CANCELLED') {
      throw new Error('Ticket has been cancelled');
    }
    // Mark as checked in
    await query(
      `UPDATE tickets SET status = 'CHECKED_IN', checked_in_at = NOW() WHERE id = $1`,
      [details.id]
    );
    return {
      success: true,
      message: 'Check-in successful',
      details,
    };
  }
};