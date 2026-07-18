# Event Reservation with Ticket and QR Code Generation

## 1. Physical Structure (Venue Layout — Master Data)

This is defined once per room and does NOT change per event. It describes the physical space only, with no reservation/occupancy status attached.

- A **Building** contains multiple **Rooms**, each located on a specific floor.
- A **Room** contains a number of **Tables**, each with a unique position/number within that room (no duplicates).
- A **Table** contains a number of **Chairs**, each numbered uniquely within that table (no duplicates).

> Note: Table and Chair numbering is scoped to their parent (Room/Table), not globally unique.

## 2. Event

An **Event** is created by the Admin and references an existing Room (venue layout), plus its own scheduling and metadata:

- Event name.
- Room reference (room number + floor, inherited/read-only from Room).
- Start time and approximate end time (the Admin is expected to factor in cleanup/teardown time when estimating the end time).

### Scheduling rules
- A Room can host **multiple Events** over time, as long as their time periods don't overlap.
- When an Event is created, the system checks the Room's schedule for conflicts with existing Events in that time window. If none, the booking is confirmed; the Room is considered "reserved" only *for that specific time period*, not permanently.
- Room occupancy/capacity status (see Section 4) is always evaluated **per Event**, never as a permanent property of the Room itself.

### Editing rules
- Before any ticket has been generated for the Event:
  - Scheduling info (name, time) and structural assignment (which tables/chairs are allocated to this event) can be freely edited.
- Once one or more tickets have been generated:
  - Table/chair assignments tied to issued tickets can no longer be edited (to avoid invalidating tickets already handed out).
  - Non-structural metadata (e.g. event name) may still be editable — decide based on what should stay consistent with printed tickets.

## 3. Reservation (Event-Scoped Occupancy)

A **Reservation** links an Event to a specific Table + Chair, and to the Ticket generated for it. This is the layer that actually tracks "is this seat taken," and it resets per event — it is NOT stored on the Chair/Table/Room objects directly.

Fields:
- Event reference.
- Table reference.
- Chair reference.
- Invitee reference.
- Ticket reference.
- Status: `active` / `cancelled`.

### Rules
- When a Reservation is created (i.e. a ticket is generated for a chair), that chair is marked reserved **for this event only**.
- When all chairs of a table have active Reservations, the table is "full" **for this event**.
- When all tables in the room are full, the room is "full" **for this event**.
- Table/Room "full" status is computed by counting active Reservations for the current event — not a stored flag on the Table/Room.
- If a Reservation is cancelled (invitee cancels, or admin reassigns), it enters a `pending_cancellation` state. Once the Admin confirms the cancellation, the chair becomes available again for that event, and full status is recalculated.

## 4. Invitee

An **Invitee** is a lightweight entity, not just a free-text name:
- Name.
- Email and/or phone (optional but recommended — enables sending the ticket digitally and detecting duplicate invites).

## 5. Ticket

A **Ticket** is generated per Reservation and contains:
- Invitee name.
- Event name (read-only, inherited from Event).
- Room number and floor (read-only, inherited from Event → Room).
- Table number and chair number (read-only, inherited from Reservation).
- QR code.

### QR code content
- The QR code should encode a **unique, non-guessable ticket reference** (e.g. a UUID or signed token) — NOT the invitee's name or seat details directly.
- At scan time, the reference is looked up server-side to retrieve and validate the actual ticket data. This prevents forged/edited QR payloads and keeps the encoded data minimal.

### Ticket status
- `issued` — generated, not yet used.
- `checked_in` — QR code has been scanned and validated at entry.
- `cancelled` — reservation was cancelled after issuance.

A ticket already marked `checked_in` must be rejected on a repeat scan (prevents duplicate entry from a copied/shared QR code).

## 6. Roles

- **Admin**: creates rooms/venue layout, creates events, generates tickets, edits events/reservations (per rules above), views all rooms and their status.
- **Gate Staff**: restricted role — can only scan QR codes and check in tickets, for the set of events they've been assigned to (can be multiple events at once). No access to event creation, editing, or room management.

## 7. Admin Interface — Summary of Capabilities

- Create/manage venue layout: rooms, floors, tables (with position), chairs (numbered per table).
- Create events: select room, define time period, name.
- Generate tickets per invitee: assign table + chair (no duplicates within the event), auto-fill event/room info, generate QR code.
- View all rooms in the building with their floor and current status (available / reserved-for-period / full-for-event, depending on context).
- Edit a reserved event's structural details, only if no tickets have been generated yet for it.
- Cancel/reassign a reservation, which frees the chair back up for that event.


