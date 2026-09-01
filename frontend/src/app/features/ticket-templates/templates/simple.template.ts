/**
 * Simple event boarding-pass style tickets.
 * Same token set and layout as the boarding pass but with a clean
 * navy / slate / white palette — modern and minimal.
 *
 * Tokens used (identical to boarding-pass):
 *   {{invitee_name}}, {{ticket_id}}, {{start_date}}
 *   {{session_1_datetime}}, {{session_1_location}}
 *   {{session_2_datetime}}, {{session_2_location}}
 *   {{qr_image}}, {{seating_label}}
 */

function simpleTemplate(opts: {
  tabBg: string;
  accent: string;
  accentMid: string;
  headingColor: string;
  kindLabel: string;
}): string {
  const { tabBg, accent, accentMid, headingColor, kindLabel } = opts;
  return `<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
.sim-wrap{width:960px;height:400px;display:inline-flex;border-radius:16px;overflow:hidden;
  background:#f5f7fa;outline:1.5px solid ${accentMid};outline-offset:-1.5px;
  font-family:'Inter',Arial,sans-serif;box-sizing:border-box;}
.sim-wrap *{box-sizing:border-box;}

/* ── left tab ── */
.sim-tab{width:68px;flex-shrink:0;background:${tabBg};display:flex;align-items:center;
  justify-content:center;position:relative;}
.sim-tab::after{content:'';position:absolute;inset:6px;border:1px solid rgba(255,255,255,0.18);
  border-radius:10px;}
.sim-tab-text{writing-mode:vertical-rl;transform:rotate(180deg);
  font-size:10px;font-weight:700;letter-spacing:6px;color:rgba(255,255,255,0.9);
  text-transform:uppercase;}

/* ── main body ── */
.sim-main{width:614px;flex-shrink:0;padding:28px 22px 22px 28px;
  display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}

/* grid watermark */
.sim-grid-bg{position:absolute;inset:0;pointer-events:none;opacity:0.06;}

/* ── header ── */
.sim-header{display:flex;align-items:flex-start;justify-content:space-between;position:relative;}
.sim-title{font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;
  color:${headingColor};}
.sim-subtitle{font-size:11px;font-weight:500;letter-spacing:0.8px;color:${accent};margin-top:3px;}
.sim-badge{width:44px;height:44px;border-radius:8px;background:${tabBg};
  display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:700;color:#fff;}

/* ── name section ── */
.sim-kind{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
  color:${accentMid};}
.sim-guest{font-family:'DM Serif Display','Georgia',serif;font-style:italic;font-size:44px;
  line-height:1.1;color:${headingColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  margin-top:2px;}
.sim-divider{height:1px;background:${accentMid};margin-top:8px;width:560px;opacity:0.5;}

/* ── sessions ── */
.sim-sessions{display:grid;grid-template-columns:1fr 1.15fr;gap:20px;position:relative;}
.sim-session{display:flex;flex-direction:column;gap:2px;}
.sim-session-header{display:flex;align-items:center;gap:6px;}
.sim-dot{width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;}
.sim-session-dt{font-size:12.5px;font-weight:700;color:${headingColor};}
.sim-session-loc{font-size:12.5px;color:#667080;margin-left:12px;}

/* ── note ── */
.sim-note{font-size:11.5px;color:#8899aa;font-style:italic;}

/* ── stub ── */
.sim-stub{flex:1;min-width:0;border-left:1px dashed ${accentMid};padding:28px 22px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
.sim-stub-date{font-family:'DM Serif Display','Georgia',serif;font-size:26px;font-weight:400;
  color:${headingColor};text-align:center;line-height:1.2;}
.sim-qr-box{width:215px;height:215px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;border:1.5px dashed rgba(80,100,130,0.3);border-radius:8px;background:#fff;}
.sim-qr-box .tpl-qr{width:196px;height:196px;display:block;object-fit:contain;background:#fff;}
.sim-seating{width:100%;text-align:center;color:${headingColor};font-size:11px;font-weight:600;
  letter-spacing:0.5px;padding-top:8px;border-top:1px solid rgba(80,100,130,0.15);}
</style>
<div class="sim-wrap">

  <div class="sim-tab">
    <span class="sim-tab-text">Invitation</span>
  </div>

  <div class="sim-main">
    <!-- subtle grid watermark -->
    <svg class="sim-grid-bg" viewBox="0 0 614 344" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="sgrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${tabBg}" stroke-width="0.5"/>
      </pattern></defs>
      <rect width="614" height="344" fill="url(#sgrid)"/>
    </svg>

    <div class="sim-header">
      <div>
        <div class="sim-title">Event Pass</div>
        <div class="sim-subtitle">REF: {{ticket_id}} &bull; VIP ACCESS</div>
      </div>
      <div class="sim-badge">#</div>
    </div>

    <div>
      <div class="sim-kind">${kindLabel}</div>
      <div class="sim-guest">{{invitee_name}}</div>
      <div class="sim-divider"></div>
    </div>

    <div class="sim-sessions">
      <div class="sim-session">
        <div class="sim-session-header">
          <div class="sim-dot"></div>
          <span class="sim-session-dt">{{session_1_datetime}}</span>
        </div>
        <span class="sim-session-loc">{{session_1_location}}</span>
      </div>
      <div class="sim-session">
        <div class="sim-session-header">
          <div class="sim-dot"></div>
          <span class="sim-session-dt">{{session_2_datetime}}</span>
        </div>
        <span class="sim-session-loc">{{session_2_location}}</span>
      </div>
    </div>

    <div class="sim-note">Please present this ticket at the entrance</div>
  </div>

  <div class="sim-stub">
    <div class="sim-stub-date">{{start_date}}</div>
    <div class="sim-qr-box">{{qr_image}}</div>
    <div class="sim-seating">{{seating_label}}</div>
  </div>

</div>`;
}

export const simpleSingleTemplateHtml = simpleTemplate({
  tabBg:       '#1e3a5f',
  accent:      '#2e6da4',
  accentMid:   '#7aaed4',
  headingColor:'#0f2233',
  kindLabel:   'Event Ticket',
});

export const simpleCoupleTemplateHtml = simpleTemplate({
  tabBg:       '#1e4a4a',
  accent:      '#2e8a7a',
  accentMid:   '#7ac4b4',
  headingColor:'#0f2222',
  kindLabel:   'Couple Event Ticket',
});
