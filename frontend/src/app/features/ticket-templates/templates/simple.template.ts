/**
 * Simple event boarding-pass style tickets.
 * ALL styles are inline — no CSS classes — so html2canvas renders correctly.
 * Uses system fonts only so no network requests are needed during PDF capture.
 */

function simpleTemplate(opts: {
  tabBg: string;
  tabBorder: string;
  outline: string;
  accent: string;
  headingColor: string;
  kindLabel: string;
  seatingLine: string;
}): string {
  const { tabBg, tabBorder, outline, accent, headingColor, kindLabel, seatingLine } = opts;

  return `<div style="width:960px;height:400px;border-radius:16px;display:inline-flex;overflow:hidden;background:#f5f7fa;outline:1.5px solid ${outline};outline-offset:-1.5px;font-family:Arial,'Helvetica Neue',sans-serif;box-sizing:border-box;">

  <!-- LEFT TAB -->
  <div style="width:68px;flex-shrink:0;box-sizing:border-box;background:${tabBg};display:flex;align-items:center;justify-content:center;position:relative;border-right:2px solid ${tabBorder};">
    <div style="position:absolute;inset:6px;border:1px solid rgba(255,255,255,0.18);border-radius:10px;pointer-events:none;"></div>
    <svg width="68" height="160" viewBox="0 0 68 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="34" y="155" text-anchor="start" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="6" fill="rgba(255,255,255,0.9)" transform="rotate(-90,34,155)">INVITATION</text>
    </svg>
  </div>

  <!-- MAIN BODY -->
  <div style="width:622px;flex-shrink:0;padding:28px 22px 22px 28px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-sizing:border-box;">

    <!-- Grid watermark -->
    <div style="position:absolute;inset:0;pointer-events:none;opacity:0.05;">
      <svg width="614" height="344" viewBox="0 0 614 344" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="pgrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${tabBg}" stroke-width="0.8"/>
        </pattern></defs>
        <rect width="614" height="344" fill="url(#pgrid)"/>
      </svg>
    </div>

    <!-- HEADER -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;position:relative;">
      <div>
        <div style="font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${headingColor};font-family:Arial,sans-serif;">Event Pass</div>
        <div style="font-size:11px;font-weight:500;letter-spacing:0.8px;color:${accent};margin-top:3px;font-family:Arial,sans-serif;">REF: {{ticket_id}} &bull; VIP ACCESS</div>
      </div>
      <div style="width:44px;height:44px;border-radius:8px;background:${tabBg};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;font-family:Arial,sans-serif;">#</div>
    </div>

    <!-- NAME -->
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${outline};font-family:Arial,sans-serif;">${kindLabel}</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:44px;line-height:1.1;color:${headingColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">{{invitee_name}}</div>
      <div style="height:1px;background:${outline};margin-top:8px;width:560px;opacity:0.5;"></div>
    </div>

    <!-- SESSIONS -->
    <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:20px;position:relative;">
      <div style="display:flex;flex-direction:column;gap:2px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;"></div>
          <span style="font-size:12.5px;font-weight:700;color:${headingColor};font-family:Arial,sans-serif;">{{session_1_datetime}}</span>
        </div>
        <span style="font-size:12.5px;color:#667080;margin-left:12px;font-family:Arial,sans-serif;">{{session_1_location}}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;"></div>
          <span style="font-size:12.5px;font-weight:700;color:${headingColor};font-family:Arial,sans-serif;">{{session_2_datetime}}</span>
        </div>
        <span style="font-size:12.5px;color:#667080;margin-left:12px;font-family:Arial,sans-serif;">{{session_2_location}}</span>
      </div>
    </div>

    <!-- NOTE -->
    <div style="font-size:11.5px;color:#8899aa;font-style:italic;font-family:Arial,sans-serif;">Please present this ticket at the entrance</div>

  </div><!-- /MAIN BODY -->

  <!-- STUB -->
  <div style="width:270px;height:400px;border-left:1px dashed ${outline};padding:28px 22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex-shrink:0;box-sizing:border-box;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:${headingColor};text-align:center;line-height:1.2;">{{start_date}}</div>
    <div style="width:215px;height:215px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px dashed rgba(80,100,130,0.3);border-radius:8px;background:#fff;">{{qr_image}}</div>
    <div style="width:100%;text-align:center;color:${headingColor};font-family:Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.5px;padding-top:8px;border-top:1px solid rgba(80,100,130,0.15);">${seatingLine}</div>
  </div>

</div>`;
}

export const simpleSingleTemplateHtml = simpleTemplate({
  tabBg:       '#1e3a5f',
  tabBorder:   '#2e6da4',
  outline:     '#7aaed4',
  accent:      '#2e6da4',
  headingColor:'#0f2233',
  kindLabel:   'Event Ticket',
  seatingLine: `ROOM <b>{{room_number}}</b> &nbsp;|&nbsp; TABLE <b>{{table_number}}</b> &nbsp;|&nbsp; CHAIR <b>{{chair_number}}</b>`,
});

export const simpleCoupleTemplateHtml = simpleTemplate({
  tabBg:       '#1e4a4a',
  tabBorder:   '#2e8a7a',
  outline:     '#7ac4b4',
  accent:      '#2e8a7a',
  headingColor:'#0f2222',
  kindLabel:   'Couple Event Ticket',
  seatingLine: `ROOM <b>{{room_number}}</b> &nbsp;|&nbsp; TABLE <b>{{table_number}}</b> &nbsp;|&nbsp; CHAIRS <b>{{chair_number}} &amp; {{paired_chair_number}}</b>`,
});
