import { query } from '../config/db';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { RoleType } from '../types/auth';
import { isEventExpired } from './events.service';

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
  reservation_room_id: string | null;
  table_number: string;
  chair_number: string;
  reservation_type: string;
  paired_table_number: string | null;
  paired_chair_number: string | null;
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
              rm.room_number, rm.floor_number, r.room_id as reservation_room_id,
              tb.table_number,
              ch.chair_number,
              r.reservation_type,
              (SELECT tb2.table_number FROM reservations r2 JOIN tables tb2 ON r2.table_id = tb2.id WHERE r2.couple_group_id = r.couple_group_id AND r2.id <> r.id LIMIT 1) as paired_table_number,
              (SELECT ch2.chair_number FROM reservations r2 JOIN chairs ch2 ON r2.chair_id = ch2.id WHERE r2.couple_group_id = r.couple_group_id AND r2.id <> r.id LIMIT 1) as paired_chair_number
        FROM tickets t
        JOIN reservations r ON t.reservation_id = r.id
        JOIN events e ON r.event_id = e.id
        JOIN invitees i ON r.invitee_id = i.id
        JOIN chairs ch ON r.chair_id = ch.id
        JOIN tables tb ON r.table_id = tb.id
        JOIN rooms rm ON rm.id = COALESCE(r.room_id, e.room_id)
        WHERE t.reservation_id = $1`,
      [reservationId]
    );
    return res.rows.length ? res.rows[0] : null;
  },

  async getDetailsById(ticketId: string): Promise<TicketDetails | null> {
    const res = await query<TicketDetails>(
      `SELECT t.*, 
              e.id as event_id, e.name as event_name, e.start_time, e.end_time,
              i.name as invitee_name, 
              rm.room_number, rm.floor_number, r.room_id as reservation_room_id,
              tb.table_number,
              ch.chair_number,
              r.reservation_type,
              (SELECT tb2.table_number FROM reservations r2 JOIN tables tb2 ON r2.table_id = tb2.id WHERE r2.couple_group_id = r.couple_group_id AND r2.id <> r.id LIMIT 1) as paired_table_number,
              (SELECT ch2.chair_number FROM reservations r2 JOIN chairs ch2 ON r2.chair_id = ch2.id WHERE r2.couple_group_id = r.couple_group_id AND r2.id <> r.id LIMIT 1) as paired_chair_number
        FROM tickets t
        JOIN reservations r ON t.reservation_id = r.id
        JOIN events e ON r.event_id = e.id
        JOIN invitees i ON r.invitee_id = i.id
        JOIN chairs ch ON r.chair_id = ch.id
        JOIN tables tb ON r.table_id = tb.id
        JOIN rooms rm ON rm.id = COALESCE(r.room_id, e.room_id)
        WHERE t.id = $1`,
      [ticketId]
    );
    return res.rows.length ? res.rows[0] : null;
  },

  async generatePdf(ticketId: string): Promise<Buffer> {
    const details = await this.getDetailsById(ticketId);
    if (!details) throw new Error('Ticket not found');
    const qrBuffer = await QRCode.toBuffer(details.qr_token, { errorCorrectionLevel: 'H', width: 180 });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 60 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const cardWidth = Math.min(400, pageWidth);
        const startX = doc.page.margins.left + (pageWidth - cardWidth) / 2;
        let y = doc.page.margins.top;

        const brandColor = '#7b1d48';
        const accentColor = '#f8eef1';
        const textColor = '#2d2d2d';
        const mutedColor = '#7a7a7a';
        const borderColor = '#e7d7d8';

        const bannerWidth = cardWidth - 48;
        const qrSize = 94;
        const qrPadding = 12;
        const textWidth = bannerWidth - qrSize - qrPadding - 20;

        // White centered card
        doc.roundedRect(startX, y, cardWidth, 640, 20).fill('#ffffff').stroke(borderColor);
        y += 24;

        // Label + title
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(20).text('Ticket Preview', startX, y, { width: cardWidth, align: 'center' });
        y += 28;

        // Banner section
        const bannerX = startX + 24;
        doc.roundedRect(bannerX, y, bannerWidth, 160, 18).fill(accentColor);

        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(22).text(details.event_name, bannerX + 18, y + 18, {
          width: textWidth,
          align: 'left',
        });
        doc.font('Helvetica').fontSize(11).fillColor(mutedColor).text(new Date(details.start_time).toLocaleString(), bannerX + 18, y + 52, {
          width: textWidth,
          align: 'left',
        });
        const isCouple = details.reservation_type === 'COUPLE';
        const seatText = isCouple
          ? `Table ${details.table_number} · Chairs ${details.chair_number} & ${details.paired_chair_number}`
          : `Table ${details.table_number} · Chair ${details.chair_number}`;
        doc.font('Helvetica').fontSize(11).text(`Room ${details.room_number} · Floor ${details.floor_number} · ${seatText}`, bannerX + 18, y + 70, {
          width: textWidth,
          align: 'left',
          lineGap: 4,
        });
        if (isCouple) {
          doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(11).text('Couple reservation', bannerX + 18, y + 92, {
            width: textWidth,
            align: 'left',
          });
        }

        const qrX = bannerX + bannerWidth - qrSize - 18;
        const qrY = y + 24;
        doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 34, 16).fill('#ffffff');
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text('Scan at entry', qrX - 10, qrY + qrSize + 14, {
          width: qrSize + 20,
          align: 'center',
        });

        y += 180;

        // Divider
        doc.strokeColor(borderColor).lineWidth(1).moveTo(startX + 24, y).lineTo(startX + cardWidth - 24, y).stroke();
        y += 28;

        // Guest info
        const labelStyle = { width: cardWidth - 96, align: 'center' as const };
        doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Guest', startX + 48, y, labelStyle);
        y += 14;
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(16).text(details.invitee_name, startX + 48, y, labelStyle);
        y += 24;

        doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Ticket ID', startX + 48, y, labelStyle);
        y += 14;
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text(details.id, startX + 48, y, labelStyle);
        y += 24;

        doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Status', startX + 48, y, labelStyle);
        y += 14;
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text(details.status.replace('_', ' '), startX + 48, y, labelStyle);
        y += 24;

        doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text('Issued', startX + 48, y, labelStyle);
        y += 14;
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text(new Date(details.issued_at).toLocaleDateString(), startX + 48, y, labelStyle);
        y += 32;

        // Footer note
        doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text(
          'This ticket is personal and non-transferable. Present it at the event entrance with a valid photo ID.',
          startX + 40,
          y,
          {
            width: cardWidth - 80,
            align: 'center',
            lineGap: 4,
          }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  async scanTicket(
    qrToken: string,
    gateStaffUserId: string,
    gateStaffUserRole: RoleType
  ): Promise<{ success: boolean; message: string; details?: TicketDetails }> {
    const res = await query<TicketDetails>(
      `SELECT t.*, 
              e.id as event_id, e.name as event_name, e.start_time, e.end_time,
              i.name as invitee_name, 
              rm.room_number, rm.floor_number, r.room_id as reservation_room_id,
              tb.table_number,
              ch.chair_number,
              r.reservation_type,
              (SELECT tb2.table_number FROM reservations r2 JOIN tables tb2 ON r2.table_id = tb2.id WHERE r2.couple_group_id = r.couple_group_id AND r2.id <> r.id LIMIT 1) as paired_table_number,
              (SELECT ch2.chair_number FROM reservations r2 JOIN chairs ch2 ON r2.chair_id = ch2.id WHERE r2.couple_group_id = r.couple_group_id AND r2.id <> r.id LIMIT 1) as paired_chair_number
        FROM tickets t
        JOIN reservations r ON t.reservation_id = r.id
        JOIN events e ON r.event_id = e.id
        JOIN invitees i ON r.invitee_id = i.id
        JOIN chairs ch ON r.chair_id = ch.id
        JOIN tables tb ON r.table_id = tb.id
        JOIN rooms rm ON rm.id = COALESCE(r.room_id, e.room_id)
        WHERE t.qr_token = $1`,
      [qrToken]
    );
    if (res.rows.length === 0) {
      throw new Error('Invalid QR Code');
    }
    const details = res.rows[0];
    const eventId = (details as any).event_id;

    if (isEventExpired((details as any).end_time)) {
      throw new Error('This event has already finished and the QR code is no longer valid');
    }
    if (details.status === 'CHECKED_IN') {
      throw new Error('Ticket already checked in');
    }
    if (details.status === 'CANCELLED') {
      throw new Error('Ticket has been cancelled');
    }

    if (gateStaffUserRole !== RoleType.SUPER_ADMIN && gateStaffUserRole !== RoleType.CLIENT_ADMIN) {
      const assignmentRes = await query(
        `SELECT 1 FROM gate_staff_assignments WHERE user_id = $1 AND event_id = $2`,
        [gateStaffUserId, eventId]
      );
      if (assignmentRes.rows.length === 0) {
        throw new Error('You are not assigned to the event for this ticket');
      }
    }

    const checkedInAt = new Date();
    await query(
      `UPDATE tickets SET status = 'CHECKED_IN', checked_in_at = NOW() WHERE id = $1`,
      [details.id]
    );

    return {
      success: true,
      message: 'Check-in successful',
      details: {
        ...details,
        status: 'CHECKED_IN',
        checked_in_at: checkedInAt,
      },
    };
  }
};