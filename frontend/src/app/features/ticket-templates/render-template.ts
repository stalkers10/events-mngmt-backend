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
    ? `<img class="tpl-qr" src="${qrDataUrl.replace(/"/g, '&quot;')}" alt="Ticket QR code" />`
    : '';

  // Session tokens — populated from event sessions array if present
  const sessions: { label?: string; datetime?: string; location?: string }[] =
    Array.isArray(details?.sessions) ? details.sessions : [];

  function sessionDatetime(idx: number): string {
    const s = sessions[idx];
    if (!s) return '';
    const label = s.label ? s.label + ' · ' : '';
    if (!s.datetime) return label.replace(/ · $/, '');
    const d = new Date(s.datetime);
    if (isNaN(d.getTime())) return label + (s.datetime ?? '');
    const date = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${label}${date} · ${time}`;
  }

  function sessionLocation(idx: number): string {
    const s = sessions[idx];
    if (!s?.location) return '';
    return `Location: ${s.location}`;
  }

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
    session_1_datetime: sessionDatetime(0),
    session_1_location: sessionLocation(0),
    session_2_datetime: sessionDatetime(1),
    session_2_location: sessionLocation(1),
    session_3_datetime: sessionDatetime(2),
    session_3_location: sessionLocation(2),
    session_4_datetime: sessionDatetime(3),
    session_4_location: sessionLocation(3),
    session_5_datetime: sessionDatetime(4),
    session_5_location: sessionLocation(4),
    session_6_datetime: sessionDatetime(5),
    session_6_location: sessionLocation(5),
  };
}

/** Replace {{token}} placeholders in a template's HTML with the context values. */
export function renderTemplateHtml(html: string, ctx: TicketTemplateContext): string {
  (Object.keys(ctx) as (keyof TicketTemplateContext)[]).forEach((key) => {
    html = html.split(`{{${key}}}`).join(String(ctx[key]));
  });
  return html;
}
