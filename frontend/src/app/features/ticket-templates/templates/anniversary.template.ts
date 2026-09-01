/**
 * Anniversary boarding-pass style tickets.
 * Same token set and layout concept as the boarding pass but with a
 * warm champagne / deep-gold palette and an art-deco feel.
 *
 * Tokens used (identical to boarding-pass):
 *   {{invitee_name}}, {{ticket_id}}, {{start_date}}
 *   {{session_1_datetime}}, {{session_1_location}}
 *   {{session_2_datetime}}, {{session_2_location}}
 *   {{qr_image}}, {{seating_label}}
 */

function anniversaryTemplate(opts: {
  tabBg: string;
  tabText: string;
  accent: string;
  accentLight: string;
  nameColor: string;
  kindLabel: string;
}): string {
  const { tabBg, tabText, accent, accentLight, nameColor, kindLabel } = opts;
  return `<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Geist:wght@400;500;700&display=swap');
.ann-wrap{width:960px;height:400px;display:inline-flex;border-radius:20px;overflow:hidden;
  background:#fdf8f0;outline:1.5px solid ${accentLight};outline-offset:-1.5px;
  font-family:'Cormorant Garamond',Georgia,serif;box-sizing:border-box;}
.ann-wrap *{box-sizing:border-box;}

/* ── left tab ── */
.ann-tab{width:68px;flex-shrink:0;background:${tabBg};display:flex;align-items:center;
  justify-content:center;position:relative;}
.ann-tab::after{content:'';position:absolute;inset:6px;border:1px dashed rgba(255,245,200,0.45);
  border-radius:14px;pointer-events:none;}
.ann-tab-text{writing-mode:vertical-rl;transform:rotate(180deg);
  font-family:'Playfair Display',Georgia,serif;font-size:11px;font-weight:700;
  letter-spacing:6px;color:${tabText};text-transform:uppercase;}

/* ── main body ── */
.ann-main{width:614px;flex-shrink:0;padding:28px 22px 22px 28px;
  display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
.ann-watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  pointer-events:none;opacity:0.045;}
.ann-watermark svg{width:560px;height:auto;}

/* ── header ── */
.ann-header{display:flex;align-items:flex-start;justify-content:space-between;position:relative;}
.ann-header-left{display:flex;flex-direction:column;gap:3px;}
.ann-title{font-family:'Playfair Display',Georgia,serif;font-size:13px;font-weight:700;
  letter-spacing:3.5px;text-transform:uppercase;color:#3a2800;}
.ann-subtitle{font-size:11px;font-weight:500;letter-spacing:1px;color:${accent};}
.ann-monogram{width:48px;height:48px;border-radius:50%;border:1px dotted ${accent};
  display:flex;align-items:center;justify-content:center;
  font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;color:${accent};}

/* ── name section ── */
.ann-name-block{position:relative;}
.ann-kind{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5c4000;}
.ann-guest{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:46px;
  line-height:1.1;color:${nameColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ann-divider{height:1.5px;background:linear-gradient(90deg,${accent},${accentLight},transparent);
  margin-top:6px;width:560px;}

/* ── sessions ── */
.ann-sessions{display:grid;grid-template-columns:1fr 1.15fr;gap:20px;position:relative;}
.ann-session{display:flex;flex-direction:column;gap:3px;}
.ann-session-header{display:flex;align-items:center;gap:7px;}
.ann-diamond{width:7px;height:7px;background:${accent};transform:rotate(45deg);flex-shrink:0;}
.ann-session-dt{font-family:'Geist','Arial',sans-serif;font-size:13px;font-weight:700;color:#3a2800;}
.ann-session-loc{font-size:13px;font-style:italic;color:#6b5020;}

/* ── footer note ── */
.ann-note{font-size:12px;font-style:italic;color:#8a6830;position:relative;}

/* ── stub ── */
.ann-stub{flex:1;min-width:0;border-left:1px dashed #c8b07a;padding:28px 22px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
.ann-stub-date{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;
  color:#3a2800;text-align:center;line-height:1.2;}
.ann-qr-box{width:215px;height:215px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;border:1.5px dashed rgba(120,80,0,0.3);border-radius:8px;background:#fff;}
.ann-qr-box .tpl-qr{width:196px;height:196px;display:block;object-fit:contain;background:#fff;}
.ann-seating{width:100%;text-align:center;color:#3a2800;font-family:'Geist','Arial',sans-serif;
  font-size:11px;font-weight:600;letter-spacing:0.5px;
  padding-top:8px;border-top:1px solid rgba(160,120,0,0.2);}
</style>
<div class="ann-wrap">

  <div class="ann-tab">
    <span class="ann-tab-text">Anniversary</span>
  </div>

  <div class="ann-main">
    <!-- watermark ring motif -->
    <div class="ann-watermark">
      <svg viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="280" cy="140" rx="220" ry="110" stroke="#8a6200" stroke-width="1"/>
        <ellipse cx="280" cy="140" rx="180" ry="88" stroke="#8a6200" stroke-width="0.6" stroke-dasharray="4 4"/>
        <ellipse cx="280" cy="140" rx="130" ry="63" stroke="#8a6200" stroke-width="0.4"/>
        <line x1="60" y1="140" x2="500" y2="140" stroke="#8a6200" stroke-width="0.4" stroke-dasharray="3 6"/>
        <line x1="280" y1="30" x2="280" y2="250" stroke="#8a6200" stroke-width="0.4" stroke-dasharray="3 6"/>
      </svg>
    </div>

    <div class="ann-header">
      <div class="ann-header-left">
        <div class="ann-title">A Celebration of Love</div>
        <div class="ann-subtitle">NO: {{ticket_id}} &bull; PRESTIGE CLASS</div>
      </div>
      <div class="ann-monogram">&#9830;</div>
    </div>

    <div class="ann-name-block">
      <div class="ann-kind">${kindLabel}</div>
      <div class="ann-guest">{{invitee_name}}</div>
      <div class="ann-divider"></div>
    </div>

    <div class="ann-sessions">
      <div class="ann-session">
        <div class="ann-session-header">
          <div class="ann-diamond"></div>
          <span class="ann-session-dt">{{session_1_datetime}}</span>
        </div>
        <span class="ann-session-loc">{{session_1_location}}</span>
      </div>
      <div class="ann-session">
        <div class="ann-session-header">
          <div class="ann-diamond"></div>
          <span class="ann-session-dt">{{session_2_datetime}}</span>
        </div>
        <span class="ann-session-loc">{{session_2_location}}</span>
      </div>
    </div>

    <div class="ann-note">Please present this ticket at the entrance</div>
  </div>

  <div class="ann-stub">
    <div class="ann-stub-date">{{start_date}}</div>
    <div class="ann-qr-box">{{qr_image}}</div>
    <div class="ann-seating">{{seating_label}}</div>
  </div>

</div>`;
}

export const anniversarySingleTemplateHtml = anniversaryTemplate({
  tabBg:      '#7a5c00',
  tabText:    '#fde88a',
  accent:     '#b8860b',
  accentLight:'#d4aa50',
  nameColor:  '#3a2800',
  kindLabel:  'Anniversary Ticket',
});

export const anniversaryCoupleTemplateHtml = anniversaryTemplate({
  tabBg:      '#5c4a1a',
  tabText:    '#f5e0a0',
  accent:     '#a07830',
  accentLight:'#c49a50',
  nameColor:  '#2e1e00',
  kindLabel:  'Couple Anniversary Ticket',
});
