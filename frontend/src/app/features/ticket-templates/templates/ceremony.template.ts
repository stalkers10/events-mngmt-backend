export const ceremonyTemplateHtml = `
<style>
.cer-tpl { width: 360px; margin: 0 auto; background: #1f2430; border-radius: 18px; overflow: hidden;
  font-family: 'Georgia', 'Times New Roman', serif; color: #e8e6e1; box-sizing: border-box;
  box-shadow: 0 10px 30px rgba(15,18,28,0.35); border: 1px solid #2e3442; }
.cer-tpl * { box-sizing: border-box; }
.cer-head { padding: 24px; text-align: center; border-bottom: 1px solid #2e3442; }
.cer-event { font-size: 21px; font-weight: 700; letter-spacing: .5px; color: #f3f0ea; line-height: 1.3; }
.cer-kind { margin-top: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: #9aa0b0; }
.cer-body { padding: 20px 24px; }
.cer-guest-label { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #9aa0b0; }
.cer-guest { font-size: 22px; font-weight: 700; margin: 2px 0 16px; color: #f3f0ea; }
.cer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
.cer-grid > div { display: flex; flex-direction: column; }
.cer-k { font-size: 10px; text-transform: uppercase; letter-spacing: 1.6px; color: #9aa0b0; }
.cer-v { font-size: 14px; font-weight: 600; color: #e8e6e1; margin-top: 2px; }
.cer-foot { display: flex; align-items: center; gap: 16px; padding: 16px 24px 22px; border-top: 1px solid #2e3442; }
.cer-qr { width: 88px; height: 88px; border-radius: 10px; background: #fff; padding: 6px; flex-shrink: 0; overflow: hidden; }
.cer-qr .tpl-qr { width: 100%; height: 100%; display: block; object-fit: contain; }
.cer-meta { flex: 1; }
.cer-meta > div { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-family: 'Segoe UI', sans-serif; }
.cer-meta .cer-k { color: #9aa0b0; }
.cer-meta .cer-v { color: #e8e6e1; font-weight: 600; }
.cer-token { font-size: 10px; color: #6f7585; word-break: break-all; margin-top: 6px; font-family: 'Segoe UI', sans-serif; }
</style>
<div class="cer-tpl">
  <div class="cer-head">
    <div class="cer-event">{{event_name}}</div>
    <div class="cer-kind">{{reservation_type}} · Ceremony</div>
  </div>
  <div class="cer-body">
    <div class="cer-guest-label">Guest of Honor</div>
    <div class="cer-guest">{{invitee_name}}</div>
    <div class="cer-grid">
      <div><span class="cer-k">Date</span><span class="cer-v">{{start_date}}</span></div>
      <div><span class="cer-k">Time</span><span class="cer-v">{{start_time}} – {{end_time}}</span></div>
      <div><span class="cer-k">Venue</span><span class="cer-v">Room {{room_number}} · Floor {{floor_number}}</span></div>
      <div><span class="cer-k">Seating</span><span class="cer-v">{{seating_label}}</span></div>
    </div>
  </div>
  <div class="cer-foot">
    <div class="cer-qr">{{qr_image}}</div>
    <div class="cer-meta">
      <div><span class="cer-k">Ticket</span><span class="cer-v">{{ticket_id}}</span></div>
      <div><span class="cer-k">Status</span><span class="cer-v">{{status}}</span></div>
      <div class="cer-token">{{qr_token}}</div>
    </div>
  </div>
</div>`;
