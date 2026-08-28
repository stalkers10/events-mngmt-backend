export const marriageTemplateHtml = `
<style>
.mar-tpl { width: 360px; margin: 0 auto; background: linear-gradient(180deg,#fff7f9 0%, #ffffff 60%);
  border-radius: 18px; overflow: hidden; font-family: 'Georgia', 'Times New Roman', serif; box-sizing: border-box;
  color: #5b3a42; box-shadow: 0 10px 30px rgba(190,90,120,0.20); border: 1px solid #f3d9e1; }
.mar-tpl * { box-sizing: border-box; }
.mar-band { height: 6px; background: linear-gradient(90deg,#e8a0b6,#d4849c,#e8a0b6); }
.mar-head { text-align: center; padding: 22px 24px 12px; }
.mar-hearts { color: #d4849c; font-size: 16px; letter-spacing: 6px; }
.mar-event { font-size: 22px; font-weight: 700; color: #8a2d4d; margin-top: 6px; font-style: italic; line-height: 1.25; }
.mar-kind { margin-top: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #c08aa0; }
.mar-body { padding: 6px 28px 18px; }
.mar-guest-label { text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #c08aa0; }
.mar-guest { text-align: center; font-size: 24px; font-weight: 700; color: #8a2d4d; margin: 4px 0 16px; }
.mar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; text-align: center; }
.mar-grid > div { display: flex; flex-direction: column; }
.mar-k { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #c08aa0; }
.mar-v { font-size: 14px; font-weight: 600; color: #5b3a42; margin-top: 3px; }
.mar-foot { display: flex; align-items: center; gap: 16px; padding: 16px 28px 22px; border-top: 1px solid #f3d9e1; }
.mar-qr { width: 88px; height: 88px; border-radius: 12px; background: #fff; padding: 6px; border: 2px solid #f3d9e1; flex-shrink: 0; overflow: hidden; }
.mar-qr .tpl-qr { width: 100%; height: 100%; display: block; object-fit: contain; border-radius: 0; }
.mar-meta { flex: 1; }
.mar-meta > div { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-family: 'Segoe UI', sans-serif; }
.mar-meta .mar-k { color: #c08aa0; }
.mar-meta .mar-v { color: #5b3a42; font-weight: 600; }
.mar-token { font-size: 10px; color: #cbb1ba; word-break: break-all; margin-top: 6px; font-family: 'Segoe UI', sans-serif; }
</style>
<div class="mar-tpl">
  <div class="mar-band"></div>
  <div class="mar-head">
    <div class="mar-hearts">&#10084; &#10084; &#10084;</div>
    <div class="mar-event">{{event_name}}</div>
    <div class="mar-kind">{{reservation_type}} Invitation</div>
  </div>
  <div class="mar-body">
    <div class="mar-guest-label">Together with our joy we invite</div>
    <div class="mar-guest">{{invitee_name}}</div>
    <div class="mar-grid">
      <div><span class="mar-k">Date</span><span class="mar-v">{{start_date}}</span></div>
      <div><span class="mar-k">Time</span><span class="mar-v">{{start_time}} – {{end_time}}</span></div>
      <div><span class="mar-k">Venue</span><span class="mar-v">Room {{room_number}} · Floor {{floor_number}}</span></div>
      <div><span class="mar-k">Seating</span><span class="mar-v">{{seating_label}}</span></div>
    </div>
  </div>
  <div class="mar-foot">
    <div class="mar-qr">{{qr_image}}</div>
    <div class="mar-meta">
      <div><span class="mar-k">Ticket</span><span class="mar-v">{{ticket_id}}</span></div>
      <div><span class="mar-k">Status</span><span class="mar-v">{{status}}</span></div>
      <div class="mar-token">{{qr_token}}</div>
    </div>
  </div>
</div>`;
