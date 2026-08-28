import { TicketTemplateContext } from './ticket-template.types';
import { renderTemplateHtml } from './render-template';

export function isBoardingPassDesign(designId: string): boolean {
  return designId === 'boarding-single' || designId === 'boarding-couple';
}

/**
 * Loads the designer-supplied artwork without recreating or restyling it.
 * Only its marked values and QR placeholder are replaced at runtime.
 */
export async function resolveBoardingPassHtml(designId: string, ctx: TicketTemplateContext): Promise<string> {
  const asset = designId === 'boarding-couple' ? 'Couple-Ticket.html' : 'Single-Ticket.html';
  const response = await fetch(`/Events/ticket-templates/${asset}`);
  if (!response.ok) throw new Error('Could not load ticket artwork');
  let html = await response.text();

  html = html
    .split('Guess Name').join('{{invitee_name}}')
    .split('19/12/2026 - Church (11 AM)').join('{{start_date}} - {{start_time}}')
    .split('19/12/2026 - Evening (7 PM)').join('{{end_date}} - {{end_time}}')
    .split('Location: Koto, St Francis of Assisi Parish').join('Room {{room_number}} · Floor {{floor_number}}')
    .split('Location: Bonamoussadi, Dakota Party Hall').join('{{event_name}}')
    .split('19-12-2026').join('{{start_date}}');

  const seating = designId === 'boarding-couple'
    ? 'Room {{room_number}} · Table {{table_number}} · Chairs {{chair_number}} &amp; {{paired_chair_number}}'
    : 'Room {{room_number}} · Table {{table_number}} · Chair {{chair_number}}';
  html = html.replace(
    /(<div data-svg-wrapper data-layer="Qr-code-container" class="QrCodeContainer">)[\s\S]*?(<\/div>\s*<div data-layer="Please respond)/,
    `$1{{qr_image}}$2`
  );
  html = html.replace(
    /(<div data-layer="Please respond via our website[^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*$)/,
    `$1${seating}$2`
  );
  html = `<style>.QrCodeContainer{width:219px;height:219px;display:grid;place-items:center}.QrCodeContainer .tpl-qr{width:186px;height:186px;display:block;object-fit:contain;background:#fff}</style>${html}`;
  return renderTemplateHtml(html, ctx);
}
