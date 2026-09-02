/**
 * Anniversary boarding-pass style tickets.
 * ALL styles are inline — no CSS classes — so html2canvas renders correctly.
 * Uses system fonts only so no network requests are needed during PDF capture.
 */

function anniversaryTemplate(opts: {
  tabBg: string;
  tabBorder: string;
  outline: string;
  accent: string;
  nameColor: string;
  kindLabel: string;
  seatingLine: string;
}): string {
  const { tabBg, tabBorder, outline, accent, nameColor, kindLabel, seatingLine } = opts;

  return `<div style="width:960px;height:400px;border-radius:20px;display:inline-flex;overflow:hidden;background:#fdf8f0;outline:1.5px solid ${outline};outline-offset:-1.5px;font-family:Georgia,'Times New Roman',serif;box-sizing:border-box;">

  <!-- LEFT TAB -->
  <div style="width:68px;flex-shrink:0;box-sizing:border-box;background:${tabBg};display:flex;align-items:center;justify-content:center;position:relative;border-right:2px solid ${tabBorder};">
    <div style="position:absolute;inset:6px;border:1px dashed rgba(255,240,180,0.5);border-radius:14px;pointer-events:none;"></div>
    <svg width="68" height="160" viewBox="0 0 68 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="34" y="155" text-anchor="start" font-family="Georgia,serif" font-size="11" font-weight="700" letter-spacing="6" fill="rgba(255,245,200,0.9)" transform="rotate(-90,34,155)">ANNIVERSARY</text>
    </svg>
  </div>

  <!-- MAIN BODY -->
  <div style="width:622px;flex-shrink:0;padding:28px 22px 22px 28px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-sizing:border-box;">

    <!-- Watermark rings -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0.04;width:500px;height:250px;">
      <svg width="500" height="250" viewBox="0 0 500 250" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="250" cy="125" rx="200" ry="100" stroke="${tabBg}" stroke-width="1.5"/>
        <ellipse cx="250" cy="125" rx="150" ry="73" stroke="${tabBg}" stroke-width="1" stroke-dasharray="4 4"/>
        <ellipse cx="250" cy="125" rx="100" ry="48" stroke="${tabBg}" stroke-width="0.8"/>
      </svg>
    </div>

    <!-- HEADER -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;position:relative;">
      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;color:#3a2800;">A Celebration of Love</div>
        <div style="font-size:11px;font-weight:500;letter-spacing:1px;color:${accent};font-family:Arial,sans-serif;">NO: {{ticket_id}} &bull; PRESTIGE CLASS</div>
      </div>
      <div style="width:44px;height:44px;border-radius:50%;border:1px dotted ${accent};display:flex;align-items:center;justify-content:center;font-size:18px;color:${accent};">&#9830;</div>
    </div>

    <!-- NAME -->
    <div style="position:relative;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a6830;font-family:Arial,sans-serif;">${kindLabel}</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:46px;line-height:1.1;color:${nameColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">{{invitee_name}}</div>
      <div style="height:1.5px;background:linear-gradient(90deg,${accent},${outline},transparent);margin-top:6px;width:560px;"></div>
    </div>

    <!-- SESSIONS -->
    <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:20px;position:relative;">
      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="width:7px;height:7px;background:${accent};transform:rotate(45deg);flex-shrink:0;"></div>
          <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#3a2800;">{{session_1_datetime}}</span>
        </div>
        <span style="font-size:13px;font-style:italic;color:#6b5020;font-family:Georgia,serif;margin-left:14px;">{{session_1_location}}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="width:7px;height:7px;background:${accent};transform:rotate(45deg);flex-shrink:0;"></div>
          <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#3a2800;">{{session_2_datetime}}</span>
        </div>
        <span style="font-size:13px;font-style:italic;color:#6b5020;font-family:Georgia,serif;margin-left:14px;">{{session_2_location}}</span>
      </div>
    </div>

    <!-- NOTE -->
    <div style="font-size:12px;font-style:italic;color:#8a6830;font-family:Georgia,serif;position:relative;">Please present this ticket at the entrance</div>

  </div><!-- /MAIN BODY -->

  <!-- STUB -->
  <div style="width:270px;height:400px;border-left:1px dotted #c8b07a;padding:28px 22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex-shrink:0;box-sizing:border-box;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#3a2800;text-align:center;line-height:1.2;">{{start_date}}</div>
    <div style="width:215px;height:215px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px dashed rgba(120,80,0,0.3);border-radius:8px;background:#fff;">{{qr_image}}</div>
    <div style="width:100%;text-align:center;color:#3a2800;font-family:Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.5px;padding-top:8px;border-top:1px solid rgba(160,120,0,0.2);">${seatingLine}</div>
  </div>

</div>`;
}

export const anniversarySingleTemplateHtml = anniversaryTemplate({
  tabBg:      '#7a5c00',
  tabBorder:  '#b8860b',
  outline:    '#d4aa50',
  accent:     '#b8860b',
  nameColor:  '#3a2800',
  kindLabel:  'Anniversary Ticket',
  seatingLine: `ROOM <b>{{room_number}}</b> &nbsp;|&nbsp; TABLE <b>{{table_number}}</b> &nbsp;|&nbsp; CHAIR <b>{{chair_number}}</b>`,
});

export const anniversaryCoupleTemplateHtml = anniversaryTemplate({
  tabBg:      '#5c4a1a',
  tabBorder:  '#a07830',
  outline:    '#c49a50',
  accent:     '#a07830',
  nameColor:  '#2e1e00',
  kindLabel:  'Couple Anniversary Ticket',
  seatingLine: `ROOM <b>{{room_number}}</b> &nbsp;|&nbsp; TABLE <b>{{table_number}}</b> &nbsp;|&nbsp; CHAIRS <b>{{chair_number}} &amp; {{paired_chair_number}}</b>`,
});
