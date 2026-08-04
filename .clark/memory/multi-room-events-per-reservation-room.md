---
name: multi-room events + per-reservation room
description: User is building a feature where the admin can select multiple rooms when creating an event (their words: "I tried to add a feature in which the admin can sele…
saved: 2026-08-03
source: user-stated
---

User is building a feature where the admin can select multiple rooms when creating an event (their words: "I tried to add a feature in which the admin can select multiple rooms when creating an event"). This is multi-room support via `events.room_ids` jsonb, primary `events.room_id`, tables belong to events (not rooms).

Follow-up decision (implemented & verified): each reservation now stores its seated room in nullable `reservations.room_id` (FK -> rooms, SET NULL), chosen at reservation time from the seating map; falls back to `COALESCE(reservation.room_id, event.room_id)` = event primary room. Ticket details + PDF resolve via COALESCE. Migration: backend/migrations/1783756802000_add_room_id_to_reservations.js (applied to local dev DB). resolveReservationRoom() in reservations.service.ts validates the room is part of the event else throws 'Selected room is not part of this event'. Seating-map assign form shows a Room* dropdown only when eventRooms().length > 1.
