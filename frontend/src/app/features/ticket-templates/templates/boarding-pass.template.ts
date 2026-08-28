/**
 * Landscape wedding ticket designs adapted from the supplied Single-Ticket and
 * Couple-Ticket artwork. Keep placeholders in {{token}} form so the renderer
 * can replace them for real tickets and downloads.
 */
function boardingPassTemplate(options: { accent: string; accentSoft: string; ink: string; kind: string; seating: string }): string {
  return `
<style>
  .bp-ticket { width: 960px; height: 400px; display: flex; overflow: hidden; border: 2px solid ${options.accentSoft}; border-radius: 24px; background: #edeae0; color: ${options.ink}; box-sizing: border-box; font-family: Georgia, 'Times New Roman', serif; box-shadow: 0 12px 28px rgba(46, 37, 20, .16); }
  .bp-ticket * { box-sizing: border-box; }
  .bp-tab { width: 72px; flex: 0 0 72px; position: relative; display: flex; align-items: center; justify-content: center; background: ${options.accent}; border-right: 2px solid ${options.accentSoft}; }
  .bp-tab:before { content: ''; position: absolute; inset: 7px; border: 1px dashed #f0d898; border-radius: 18px; }
  .bp-tab span { position: relative; color: #fff9df; font-size: 28px; letter-spacing: 9px; writing-mode: vertical-rl; transform: rotate(180deg); }
  .bp-main { width: 618px; padding: 32px 24px 26px 32px; position: relative; display: flex; flex-direction: column; overflow: hidden; }
  .bp-main:before { content: ''; position: absolute; inset: 0; opacity: .3; background: radial-gradient(ellipse at 28% 34%, transparent 0 20%, ${options.accentSoft} 21% 21.4%, transparent 22% 37%, ${options.accentSoft} 38% 38.3%, transparent 39%); pointer-events: none; }
  .bp-top, .bp-name, .bp-schedule, .bp-note { position: relative; }
  .bp-top { display: flex; align-items: flex-start; justify-content: space-between; }
  .bp-title { font: 700 16px/1.1 Arial, sans-serif; letter-spacing: 4px; }
  .bp-subtitle { margin-top: 5px; color: ${options.accent}; font: 600 11px/1.2 Arial, sans-serif; letter-spacing: 1.5px; text-transform: uppercase; }
  .bp-monogram { width: 50px; height: 50px; display: grid; place-items: center; border: 1px dotted ${options.accent}; border-radius: 50%; color: ${options.accent}; font-size: 23px; font-style: italic; }
  .bp-name { margin-top: 41px; }
  .bp-kind { font: 700 14px/1 Arial, sans-serif; text-transform: uppercase; letter-spacing: .5px; }
  .bp-guest { min-height: 63px; margin-top: 5px; padding-bottom: 10px; border-bottom: 2px solid ${options.accentSoft}; font-size: 45px; line-height: 1.1; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bp-schedule { display: grid; grid-template-columns: 1fr 1.15fr; gap: 24px; margin-top: 21px; }
  .bp-detail { min-width: 0; }
  .bp-detail strong { display: block; font: 700 14px/1.25 Arial, sans-serif; }
  .bp-detail strong:before { content: '◆'; color: ${options.accentSoft}; font-size: 10px; margin-right: 10px; }
  .bp-detail span { display: block; margin: 5px 0 0 20px; font-size: 14px; font-style: italic; line-height: 1.2; }
  .bp-note { margin-top: auto; color: #5c4a30; font-size: 13px; font-style: italic; }
  .bp-stub { flex: 1; min-width: 0; padding: 27px 24px; border-left: 2px dotted #9a9080; display: flex; flex-direction: column; align-items: center; }
  .bp-date { color: ${options.ink}; font-size: 31px; font-weight: 700; line-height: 1; letter-spacing: .4px; white-space: nowrap; }
  .bp-qr-frame { width: 219px; height: 219px; margin-top: 24px; display: grid; place-items: center; border: 1px dashed rgba(69, 5, 19, .42); border-radius: 8px; background: #f8f6ef; }
  .bp-qr-frame .tpl-qr { width: 186px; height: 186px; display: block; object-fit: contain; background: #fff; }
  .bp-seat { width: 100%; margin-top: 13px; padding-top: 8px; border-top: 1px solid rgba(92, 74, 48, .25); text-align: center; color: #2c2415; font: 600 11px/1.35 Arial, sans-serif; letter-spacing: .4px; }
  .bp-seat b { color: ${options.accent}; font-size: 12px; }
</style>
<div class="bp-ticket">
  <aside class="bp-tab"><span>INVITATION</span></aside>
  <section class="bp-main">
    <div class="bp-top"><div><div class="bp-title">BOARDING PASS FOR LOVE</div><div class="bp-subtitle">Elite Events &middot; {{event_name}}</div></div><div class="bp-monogram">E</div></div>
    <div class="bp-name"><div class="bp-kind">${options.kind}</div><div class="bp-guest">{{invitee_name}}</div></div>
    <div class="bp-schedule">
      <div class="bp-detail"><strong>{{start_date}} &middot; {{start_time}}</strong><span>{{event_name}}</span></div>
      <div class="bp-detail"><strong>{{end_date}} &middot; {{end_time}}</strong><span>Room {{room_number}} &middot; Floor {{floor_number}}</span></div>
    </div>
    <div class="bp-note">Please present this ticket at the entrance.</div>
  </section>
  <aside class="bp-stub"><div class="bp-date">{{start_date}}</div><div class="bp-qr-frame">{{qr_image}}</div><div class="bp-seat">${options.seating}</div></aside>
</div>`;
}

export const boardingSingleTemplateHtml = boardingPassTemplate({
  accent: '#636b2f', accentSoft: '#c9a84c', ink: '#2c1a0e', kind: 'Wedding Ticket',
  seating: 'ROOM <b>{{room_number}}</b> &nbsp;|&nbsp; TABLE <b>{{table_number}}</b> &nbsp;|&nbsp; CHAIR <b>{{chair_number}}</b>',
});

export const boardingCoupleTemplateHtml = boardingPassTemplate({
  accent: '#6b6030', accentSoft: '#c0aa78', ink: '#2c2415', kind: 'Couple Wedding Ticket',
  seating: 'ROOM <b>{{room_number}}</b> &nbsp;|&nbsp; TABLE <b>{{table_number}}</b> &nbsp;|&nbsp; CHAIRS <b>{{chair_number}} &amp; {{paired_chair_number}}</b>',
});
