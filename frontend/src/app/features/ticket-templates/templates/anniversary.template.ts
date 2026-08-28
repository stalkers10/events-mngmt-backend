export const anniversaryTemplateHtml = `
<style>
.ann-tpl { width: 360px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #3a2f1b; box-sizing: border-box;
  box-shadow: 0 10px 30px rgba(180,140,40,0.22); border: 1px solid #efe2c2; }
.ann-tpl * { box-sizing: border-box; }
.ann-head { background: linear-gradient(120deg,#caa64a 0%,#e9d18a 45%,#b8922f 100%); color: #4a3a12;
  padding: 24px; text-align: center; }
.ann-event { font-size: 21px; font-weight: 700; letter-spacing: .4px; line-height: 1.25; }
.ann-kind { margin-top: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; opacity: .75; }
.ann-body { padding: 20px 24px; }
.ann-guest-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #b08a2e; }
.ann-guest { font-size: 22px; font-weight: 700; margin: 2px 0 16px; color: #8a6a1a; }
.ann-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
.ann-grid > div { display: flex; flex-direction: column; }
.ann-k { font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: #b08a2e; }
.ann-v { font-size: 14px; font-weight: 600; color: #3a2f1b; margin-top: 2px; }
.ann-foot { display: flex; align-items: center; gap: 16px; padding: 16px 24px 22px; border-top: 1px solid #efe2c2; }
.ann-qr { width: 88px; height: 88px; border-radius: 10px; background: #fff; padding: 6px; border: 1px solid #e3d3a6; flex-shrink: 0; overflow: hidden; }
.ann-qr .tpl-qr { width: 100%; height: 100%; display: block; object-fit: contain; }
.ann-meta { flex: 1; }
.ann-meta > div { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
.ann-meta .ann-k { color: #b08a2e; }
.ann-meta .ann-v { color: #3a2f1b; font-weight: 600; }
.ann-token { font-size: 10px; color: #c2b079; word-break: break-all; margin-top: 6px; }
</style>
<div class="ann-tpl">
  <div class="ann-head">
    <div class="ann-event">{{event_name}}</div>
    <div class="ann-kind">{{reservation_type}} · Anniversary</div>
  </div>
  <div class="ann-body">
    <div class="ann-guest-label">Honored Guest</div>
    <div class="ann-guest">{{invitee_name}}</div>
    <div class="ann-grid">
      <div><span class="ann-k">Date</span><span class="ann-v">{{start_date}}</span></div>
      <div><span class="ann-k">Time</span><span class="ann-v">{{start_time}} – {{end_time}}</span></div>
      <div><span class="ann-k">Venue</span><span class="ann-v">Room {{room_number}} · Floor {{floor_number}}</span></div>
      <div><span class="ann-k">Seating</span><span class="ann-v">{{seating_label}}</span></div>
    </div>
  </div>
  <div class="ann-foot">
    <div class="ann-qr">{{qr_image}}</div>
    <div class="ann-meta">
      <div><span class="ann-k">Ticket</span><span class="ann-v">{{ticket_id}}</span></div>
      <div><span class="ann-k">Status</span><span class="ann-v">{{status}}</span></div>
      <div class="ann-token">{{qr_token}}</div>
    </div>
  </div>
</div>`;
