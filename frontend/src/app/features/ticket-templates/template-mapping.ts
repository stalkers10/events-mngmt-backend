import { TicketTemplateContext } from './ticket-template.types';

export type TicketFieldMapping = Partial<Record<
  'guest' | 'eventName' | 'start' | 'end' | 'venue' | 'seating' | 'qr',
  string
>>;

export const requiredMappingFields: (keyof TicketFieldMapping)[] = ['guest', 'eventName', 'start', 'seating', 'qr'];

export const mappingLabels: Record<keyof TicketFieldMapping, string> = {
  guest: 'Guest name', eventName: 'Event name', start: 'Start date & time', end: 'End date & time',
  venue: 'Room & floor', seating: 'Room, table & chair(s)', qr: 'QR-code frame',
};

/** A plain value such as `CoupleNames` means the designer's `.CoupleNames` class. */
export function normalizeMappingSelector(value: string): string {
  const selector = value.trim();
  return /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(selector) ? `.${selector}` : selector;
}

function findMappedElement(doc: Document, value: string): Element | null {
  const match = value.trim().match(/^([A-Za-z_-][A-Za-z0-9_-]*)#(\d+)$/);
  if (match) return doc.querySelectorAll(`.${match[1]}`).item(Number(match[2]) - 1);
  return doc.querySelector(normalizeMappingSelector(value));
}

export function mappingIsComplete(mapping: TicketFieldMapping): boolean {
  return requiredMappingFields.every((field) => !!mapping[field]?.trim());
}

/** Returns a readable error when a required mapping cannot target the supplied designer HTML. */
export function validateMappingSelectors(html: string, mapping: TicketFieldMapping): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const field of requiredMappingFields) {
    const selector = mapping[field]?.trim();
    if (!selector) return `${mappingLabels[field]} is not mapped.`;
    try {
      if (!findMappedElement(doc, selector)) return `${mappingLabels[field]} selector does not match this HTML.`;
    } catch {
      return `${mappingLabels[field]} selector is not valid CSS.`;
    }
  }
  return null;
}

/** Inserts live values into mapped elements without altering any other artwork. */
export function renderMappedTemplate(html: string, ctx: TicketTemplateContext, mapping: TicketFieldMapping = {}): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const values: Record<Exclude<keyof TicketFieldMapping, 'qr'>, string> = {
    guest: ctx.invitee_name,
    eventName: ctx.event_name,
    start: `${ctx.start_date} · ${ctx.start_time}`,
    end: `${ctx.end_date} · ${ctx.end_time}`,
    venue: `Room ${ctx.room_number} · Floor ${ctx.floor_number}`,
    seating: ctx.reservation_type === 'Couple'
      ? `Room ${ctx.room_number} · Table ${ctx.table_number} · Chairs ${ctx.chair_number} & ${ctx.paired_chair_number}`
      : `Room ${ctx.room_number} · Table ${ctx.table_number} · Chair ${ctx.chair_number}`,
  };
  for (const [field, selector] of Object.entries(mapping)) {
    if (!selector?.trim()) continue;
    let target: Element | null;
    try { target = findMappedElement(doc, selector); } catch { continue; }
    if (!target) continue;
    if (field === 'qr') target.innerHTML = ctx.qr_image;
    else target.textContent = values[field as Exclude<keyof TicketFieldMapping, 'qr'>];
  }
  return doc.documentElement.outerHTML;
}
