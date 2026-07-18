# Backend Implementation Walkthrough

## 1. Venue/Room Routes Implemented

I have implemented the backend routes for the venue management, splitting buildings and rooms into their own dedicated endpoints.

### Buildings Endpoints
All routes under `POST` or `GET` to `/buildings` are implemented and secured for `Admin` role only.
- `GET /buildings`: Lists all buildings
- `POST /buildings`: Creates a new building (takes `name` and optional `address`)

### Rooms & Substructure Endpoints
All routes under `/rooms` are implemented and secured for `Admin` role only.
- `GET /rooms?buildingId=...`: Lists all rooms, optionally filtered by building.
- `POST /rooms`: Creates a room.
- `GET /rooms/:roomId`: Fetches the detailed breakdown of the room, including all tables and chairs nested properly.
- `POST /rooms/:roomId/tables`: Add a single table to a room.
- `POST /rooms/tables/:tableId/chairs`: Add a single chair to a table.
- `POST /rooms/:roomId/tables/bulk`: Add a table and `N` chairs at once (convenience endpoint for fast setup).

The unique constraints are correctly handled. If the frontend tries to create two tables with the same number in the same room, it'll correctly receive a `409 Conflict` error.

---

## 2. Events Routes Implemented

I have implemented the backend routes for Event scheduling and management, enforcing all the constraints from the specification.

### Implemented Endpoints
- `GET /events`: 
  - If requested by an `ADMIN`, returns all events across all rooms.
  - If requested by a `GATE_STAFF`, returns **only** the events they have been assigned to.
- `GET /events/:eventId`: Detailed fetch of an event (Admin only).
- `POST /events`: Creates a new event (Admin only).
- `PUT /events/:eventId`: Updates event details (Admin only).
- `DELETE /events/:eventId`: Deletes an event (Admin only).

### Business Logic Enforced

1. **Double Booking Prevention**: When creating or updating an event, the system checks if the specified room already has an event running during the `[startTime, endTime]` window. If an overlap is found, it throws a `409 Conflict` error.
2. **Structural Edit Locks**: When updating an event, the system checks if any tickets have already been issued for this event. If tickets exist, attempting to change the `roomId` will be explicitly rejected, protecting the validity of the printed tickets. Changing the room is only allowed if 0 tickets have been generated.
3. **Safe Deletion**: Deleting an event is blocked if any tickets have been generated for it.

---

## 3. Reservations & Tickets Implemented

I have implemented the complex flows for booking seats and generating secure tickets.

### Reservations Endpoints
- `POST /reservations`: Creates an invitee, books the specified chair/table for the event, and automatically generates a `Ticket` with a secure UUID QR token. It returns the reservation ID, ticket ID, and a Base64 encoded QR Code image so the admin can display it immediately. It enforces the partial unique index against double-booking the same chair for the same event.
- `GET /reservations/event/:eventId/occupancy`: Returns the complete table/chair layout for the event's room, annotated with whether each chair is available or reserved (and by whom).
- `DELETE /reservations/:reservationId`: Cancels the reservation and the associated ticket.

### Tickets Endpoints
- `GET /tickets/:ticketId/pdf`: A dedicated route for generating a full PDF ticket on the fly. It utilizes `pdfkit` to build a beautifully formatted PDF containing the event name, time, room details, invitee name, and the generated QR code.
- `POST /tickets/scan`: The endpoint for Gate Staff (and Admins). It expects a `{ qrToken }` body. It looks up the ticket, verifies the Gate Staff is assigned to the event, and strictly checks if the ticket is `ISSUED` vs `CHECKED_IN` to prevent duplicate scans.

The backend is completely fully implemented according to the specification. Let me know what you'd like to work on next. We can now transition to the frontend to build out the screens for these features.
