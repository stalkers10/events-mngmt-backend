import { TicketTemplateContext } from './ticket-template.types';

const DATE_OPTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
const TIME_OPTS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

function fmtDate(value: unknown): string {
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, DATE_OPTS);
}

function fmtTime(value: unknown): string {
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, TIME_OPTS);
}

/** Build the token context consumed by a template's {{placeholders}}. */
export function buildContext(details: any, qrDataUrl: string): TicketTemplateContext {
  const isCouple = details?.reservation_type === 'COUPLE';
  const seating = isCouple
    ? `Table ${details?.table_number ?? ''} · Chairs ${details?.chair_number ?? ''} & ${details?.paired_chair_number ?? ''}`
    : `Table ${details?.table_number ?? ''} · Chair ${details?.chair_number ?? ''}`;
  const qrImage = qrDataUrl
    ? `<img class="tpl-qr" src="${qrDataUrl}" alt="Ticket QR code" />`
    : '';

  return {
    event_name: details?.event_name ?? '',
    invitee_name: details?.invitee_name ?? '',
    start_date: fmtDate(details?.start_time),
    start_time: fmtTime(details?.start_time),
    end_date: fmtDate(details?.end_time),
    end_time: fmtTime(details?.end_time),
    room_number: details?.room_number ?? '',
    floor_number: details?.floor_number != null ? String(details.floor_number) : '',
    table_number: details?.table_number ?? '',
    chair_number: details?.chair_number ?? '',
    paired_table_number: details?.paired_table_number ?? '',
    paired_chair_number: details?.paired_chair_number ?? '',
    seating_label: seating,
    reservation_type: details?.reservation_type === 'COUPLE' ? 'Couple' : 'Single',
    status: (details?.status ?? '').replace(/_/g, ' '),
    ticket_id: details?.id ?? '',
    qr_token: details?.qr_token ?? '',
    qr_image: qrImage,
  };
}

/** Replace {{token}} placeholders in a template's HTML with the context values. */
export function renderTemplateHtml(html: string, ctx: TicketTemplateContext): string {
  (Object.keys(ctx) as (keyof TicketTemplateContext)[]).forEach((key) => {
    html = html.split(`{{${key}}}`).join(String(ctx[key]));
  });
  return html;
}
