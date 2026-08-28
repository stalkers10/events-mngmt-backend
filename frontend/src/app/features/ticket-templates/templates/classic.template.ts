export const classicTemplateHtml = `
<style>
.cla-tpl { width: 360px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2d2d; box-sizing: border-box;
  box-shadow: 0 10px 30px rgba(87,0,19,0.18); border: 1px solid #f0dfe3; }
.cla-tpl * { box-sizing: border-box; }
.cla-head { background: #570013; color: #fff; padding: 22px 24px; }
.cla-event { font-size: 20px; font-weight: 700; letter-spacing: .3px; line-height: 1.25; }
.cla-kind { margin-top: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: .8; }
.cla-body { padding: 20px 24px; }
.cla-guest-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9a7a82; }
.cla-guest { font-size: 22px; font-weight: 700; margin: 2px 0 16px; color: #570013; }
.cla-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
.cla-grid > div { display: flex; flex-direction: column; }
.cla-k { font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: #9a7a82; }
.cla-v { font-size: 14px; font-weight: 600; color: #2d2d2d; margin-top: 2px; }
.cla-foot { display: flex; align-items: center; gap: 16px; padding: 16px 24px 22px;
  border-top: 1px dashed #e7d2d7; }
.cla-qr { width: 88px; height: 88px; border-radius: 10px; background: #fff; padding: 6px; border: 1px solid #eee; flex-shrink: 0; overflow: hidden; }
.cla-qr .tpl-qr { width: 100%; height: 100%; display: block; object-fit: contain; }
.cla-meta { flex: 1; }
.cla-meta > div { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
.cla-meta .cla-k { color: #9a7a82; }
.cla-meta .cla-v { color: #2d2d2d; font-weight: 600; }
.cla-token { font-size: 10px; color: #b39aa1; word-break: break-all; margin-top: 6px; }
</style>
<div class="cla-tpl">
  <div class="cla-head">
    <div class="cla-event">{{event_name}}</div>
    <div class="cla-kind">{{reservation_type}}</div>
  </div>
  <div class="cla-body">
    <div class="cla-guest-label">Guest of Honor</div>
    <div class="cla-guest">{{invitee_name}}</div>
    <div class="cla-grid">
      <div><span class="cla-k">Date</span><span class="cla-v">{{start_date}}</span></div>
      <div><span class="cla-k">Time</span><span class="cla-v">{{start_time}} – {{end_time}}</span></div>
      <div><span class="cla-k">Venue</span><span class="cla-v">Room {{room_number}} · Floor {{floor_number}}</span></div>
      <div><span class="cla-k">Seating</span><span class="cla-v">{{seating_label}}</span></div>
    </div>
  </div>
  <div class="cla-foot">
    <div class="cla-qr">{{qr_image}}</div>
    <div class="cla-meta">
      <div><span class="cla-k">Ticket</span><span class="cla-v">{{ticket_id}}</span></div>
      <div><span class="cla-k">Status</span><span class="cla-v">{{status}}</span></div>
      <div class="cla-token">{{qr_token}}</div>
    </div>
  </div>
</div>`;
