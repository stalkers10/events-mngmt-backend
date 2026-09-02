/**
 * Midnight Gala ticket templates.
 *
 * A widescreen boarding-pass style layout (left tab + main ticket body +
 * tear-off stub), rebuilt with the original "Midnight Gala" color palette
 * (deep navy `#1f2430` + steel `#9aa0b0` + soft cream `#e8e6e1`) and its
 * original font family (Georgia serif).
 *
 * Tokens used:
 *   {{event_name}}, {{invitee_name}}, {{ticket_id}}, {{start_date}},
 *   {{session_1_datetime}}, {{session_1_location}}, {{session_2_datetime}},
 *   {{session_2_location}}, {{seating_label}}, {{qr_image}}
 */

/**
 * Each variant carries its own accent so the single and couple tickets are
 * visibly distinct (mirroring the boarding-pass pair, which uses a cool green
 * for single and a warm gold for couple). Both stay within the gala's navy +
 * steel + cream family.
 */
type GalaAccent = { accent: string; accMuted: string; tabTop: string; tabBottom: string };

const SINGLE_ACCENT: GalaAccent = {
  accent: '#C9C4B8',   // cool steel-champagne
  accMuted: '#9aa0b0', // steel
  tabTop: '#2e3442',
  tabBottom: '#262b38',
};

const COUPLE_ACCENT: GalaAccent = {
  accent: '#D6BF7E',   // warm gold-champagne
  accMuted: '#B8A96A', // muted gold
  tabTop: '#3A3345',
  tabBottom: '#2B2733',
};

function buildMidnightGalaStyles(a: GalaAccent): string {
  return `
<style>
.ng-tpl {
  width: 960px;
  height: 400px;
  margin: 0 auto;
  border-radius: 24px;
  overflow: hidden;
  background: #1f2430;
  border: 1.5px solid ${a.tabTop};
  display: flex;
  align-items: stretch;
  font-family: Georgia, 'Times New Roman', serif;
  color: #e8e6e1;
  box-sizing: border-box;
  box-shadow: 0 10px 30px rgba(15,18,28,0.45);
}
.ng-tpl * { box-sizing: border-box; }
.ng-tab {
  width: 72px;
  flex-shrink: 0;
  background: linear-gradient(180deg, ${a.tabTop} 0%, ${a.tabBottom} 100%);
  border-right: 1px solid #2e3442;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ng-tab-inner {
  width: 56px;
  height: calc(100% - 28px);
  border: 1px dashed ${a.accent};
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}
.ng-tab-dot { width: 6px; height: 6px; transform: rotate(45deg); background: ${a.accent}; }
.ng-tab-line { width: 2px; height: 64px; background: ${a.accMuted}; }
.ng-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 26px 28px 26px 32px;
  position: relative;
}
.ng-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid #2e3442;
  padding-bottom: 14px;
}
.ng-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #f3f0ea;
  margin: 0;
}
.ng-flight {
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${a.accent};
  margin-top: 4px;
}
.ng-emblem {
  width: 42px;
  height: 42px;
  border: 1.5px solid ${a.accent};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${a.accent};
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.ng-name-row { margin-top: 14px; }
.ng-label {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #9aa0b0;
}
.ng-name {
  font-size: 42px;
  font-weight: 700;
  line-height: 1.1;
  color: #f3f0ea;
  margin: 4px 0 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ng-rule { height: 1px; background: ${a.accent}; }
.ng-schedule { display: flex; gap: 40px; margin-top: 16px; }
.ng-item { flex: 1; display: flex; flex-direction: column; }
.ng-item-head { display: flex; align-items: center; gap: 10px; }
.ng-diamond { width: 7px; height: 7px; transform: rotate(45deg); background: ${a.accent}; flex-shrink: 0; }
.ng-item-date { font-size: 14px; font-weight: 700; color: #f3f0ea; }
.ng-item-loc { font-size: 13px; font-style: italic; color: #9aa0b0; margin-top: 4px; }
.ng-note {
  font-size: 12px;
  font-style: italic;
  color: #9aa0b0;
  margin-top: 16px;
}
.ng-stub {
  width: 250px;
  flex-shrink: 0;
  border-left: 1px dotted ${a.accMuted};
  padding: 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.ng-stub-date-label {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #9aa0b0;
}
.ng-stub-date {
  font-size: 32px;
  font-weight: 700;
  color: #f3f0ea;
  text-align: center;
}
.ng-qr {
  width: 140px;
  height: 140px;
  background: #fff;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #2e3442;
  overflow: hidden;
}
.ng-qr .tpl-qr { width: 100%; height: 100%; display: block; object-fit: contain; }
.ng-stub-seat {
  font-size: 11px;
  color: ${a.accent};
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>`;
}

const midnightGalaBody = (type: 'single' | 'couple') => `${buildMidnightGalaStyles(type === 'couple' ? COUPLE_ACCENT : SINGLE_ACCENT)}
<div class="ng-tpl">
  <div class="ng-tab">
    <div class="ng-tab-inner">
      <span class="ng-tab-dot"></span>
      <span class="ng-tab-line"></span>
      <span class="ng-tab-dot"></span>
    </div>
  </div>
  <div class="ng-body">
    <div>
      <div class="ng-top">
        <div>
          <div class="ng-title">Midnight Gala</div>
          <div class="ng-flight">{{event_name}} &bull; FLIGHT NO: {{ticket_id}} &bull; CLASS: LUXURY</div>
        </div>
        <div class="ng-emblem">${type === 'couple' ? '&hearts;' : '&#10022;'}</div>
      </div>
      <div class="ng-name-row">
        <div class="ng-label">Guest of Honor</div>
        <div class="ng-name">{{invitee_name}}</div>
        <div class="ng-rule"></div>
      </div>
    </div>
    <div>
      <div class="ng-schedule">
        <div class="ng-item">
          <div class="ng-item-head"><span class="ng-diamond"></span><span class="ng-item-date">{{session_1_datetime}}</span></div>
          <div class="ng-item-loc">{{session_1_location}}</div>
        </div>
        <div class="ng-item">
          <div class="ng-item-head"><span class="ng-diamond"></span><span class="ng-item-date">{{session_2_datetime}}</span></div>
          <div class="ng-item-loc">{{session_2_location}}</div>
        </div>
      </div>
      <div class="ng-note">Please present this ticket at the entrance</div>
    </div>
  </div>
  <div class="ng-stub">
    <div class="ng-stub-date-label">Event Date</div>
    <div class="ng-stub-date">{{start_date}}</div>
    <div class="ng-qr">{{qr_image}}</div>
    <div class="ng-stub-seat">{{seating_label}}</div>
  </div>
</div>`;

export const midnightGalaSingleTemplateHtml = midnightGalaBody('single');
export const midnightGalaCoupleTemplateHtml = midnightGalaBody('couple');
