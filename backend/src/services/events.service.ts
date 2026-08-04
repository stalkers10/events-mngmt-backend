import { query } from '../config/db';
export const EVENT_GRACE_MINUTES = 30;

export function isEventExpired(endTime: Date | string, now: Date = new Date(), graceMinutes = EVENT_GRACE_MINUTES): boolean {
  const expiryTime = new Date(endTime).getTime() + graceMinutes * 60 * 1000;
  return expiryTime < now.getTime();
}

export function isEventVisible(endTime: Date | string, now: Date = new Date(), graceMinutes = EVENT_GRACE_MINUTES): boolean {
  return !isEventExpired(endTime, now, graceMinutes);
}

export interface EventRecord {
  id: string;
  room_id: string;
  room_ids: string[];
  name: string;
  start_time: Date;
  end_time: Date;
  created_at: Date;
}

export function normalizeRoomIds(roomIds: unknown, fallbackRoomId?: string | null): string[] {
  if (Array.isArray(roomIds)) {
    return roomIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  if (typeof roomIds === 'string') {
    try {
      const parsed = JSON.parse(roomIds);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
      }
    } catch {
      // Ignore invalid JSON and fall back to the primary room id.
    }
  }

  return fallbackRoomId && fallbackRoomId.length > 0 ? [fallbackRoomId] : [];
}

type EventLike = Partial<EventRecord>;

export function normalizeEventRecord(event: EventLike): EventRecord {
  const startTimeValue = event.start_time as unknown;
  const endTimeValue = event.end_time as unknown;
  const createdAtValue = event.created_at as unknown;

  return {
    id: typeof event.id === 'string' ? event.id : '',
    room_id: typeof event.room_id === 'string' ? event.room_id : '',
    room_ids: normalizeRoomIds(event.room_ids, typeof event.room_id === 'string' ? event.room_id : undefined),
    name: typeof event.name === 'string' ? event.name : '',
    start_time: startTimeValue instanceof Date ? startTimeValue : new Date(startTimeValue as string | Date),
    end_time: endTimeValue instanceof Date ? endTimeValue : new Date(endTimeValue as string | Date),
    created_at: createdAtValue instanceof Date ? createdAtValue : new Date(createdAtValue as string | Date),
  };
}

export interface TableRecord {
  id: string;
  event_id: string;
  room_id: string;
  table_number: string;
  position: string | null;
  created_at: Date;
  chairs?: ChairRecord[];
}
export interface ChairRecord {
  id: string;
  table_id: string;
  chair_number: string;
  created_at: Date;
}
export const EventsService = {
  async listAll(): Promise<EventRecord[]> {
    const result = await query<EventRecord>(
      `SELECT * FROM events WHERE end_time + interval '30 minutes' > NOW() ORDER BY start_time ASC`
    );
    return result.rows.map((event) => normalizeEventRecord(event));
  },
  async listForGateStaff(userId: string): Promise<EventRecord[]> {
    const result = await query<EventRecord>(
      `SELECT e.* 
       FROM events e
       JOIN gate_staff_assignments gsa ON e.id = gsa.event_id
       WHERE gsa.user_id = $1
         AND e.end_time + interval '30 minutes' > NOW()
       ORDER BY e.start_time ASC`,
      [userId]
    );
    return result.rows.map((event) => normalizeEventRecord(event));
  },
  async getById(eventId: string): Promise<EventRecord | null> {
    const result = await query<EventRecord>(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );
    return result.rows.length > 0 ? normalizeEventRecord(result.rows[0]) : null;
  },
  async getTables(eventId: string): Promise<TableRecord[]> {
    const result = await query<TableRecord>(
      `SELECT * FROM tables WHERE event_id = $1 ORDER BY table_number`,
      [eventId]
    );
    return result.rows;
  },
  async getTablesWithChairs(eventId: string): Promise<(TableRecord & { chairs: ChairRecord[] })[]> {
    const tables = await this.getTables(eventId);
    const tablesWithChairs: (TableRecord & { chairs: ChairRecord[] })[] = [];
    for (const table of tables) {
      const result = await query<ChairRecord>(
        `SELECT * FROM chairs WHERE table_id = $1 ORDER BY chair_number`,
        [table.id]
      );
      tablesWithChairs.push({ ...table, chairs: result.rows });
    }
    return tablesWithChairs;
  },
  async checkRoomAvailability(roomId: string, startTime: Date, endTime: Date, excludeEventId?: string): Promise<boolean> {
    let sql = `SELECT id FROM events 
               WHERE (
                 room_id = $1
                 OR EXISTS (
                   SELECT 1
                   FROM jsonb_array_elements_text(COALESCE(room_ids, '[]'::jsonb)) AS assigned_room_id
                   WHERE assigned_room_id::uuid = $1
                 )
               )
               AND start_time < $3 
               AND end_time > $2`;
    const params: any[] = [roomId, startTime, endTime];
    if (excludeEventId) {
      sql += ` AND id != $4`;
      params.push(excludeEventId);
    }
    const result = await query(sql, params);
    return result.rows.length === 0;
  },
  async hasTickets(eventId: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) FROM tickets t
       JOIN reservations r ON t.reservation_id = r.id
       WHERE r.event_id = $1`,
      [eventId]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  },
   isInPast(date: Date, now = new Date()): boolean {
    return date.getTime() < now.getTime();
  },

  async create(roomIds: string[], name: string, startTime: Date, endTime: Date, tables?: { tableNumber: string; position?: string; numberOfChairs: number; roomId?: string }[]): Promise<EventRecord> {
    if (this.isInPast(startTime)) {
      throw new Error('Event start time cannot be in the past');
    }
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }

    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    if (uniqueRoomIds.length === 0) {
      throw new Error('Select at least one room for this event');
    }

    const primaryRoomId = uniqueRoomIds[0];
    if (tables && tables.length > 0) {
      const roomsWithTables = new Set(tables.map((table) => table.roomId || primaryRoomId));
      const missingRoom = uniqueRoomIds.find((roomId) => !roomsWithTables.has(roomId));
      if (missingRoom) {
        throw new Error('Each selected room must have seating configured before creating the event');
      }
    }

    for (const roomId of uniqueRoomIds) {
      const isAvailable = await this.checkRoomAvailability(roomId, startTime, endTime);
      if (!isAvailable) {
        throw new Error('One or more selected rooms are already booked during this time');
      }
    }

    const roomIdsPayload = JSON.stringify(uniqueRoomIds);

    if (!tables || tables.length === 0) {
      const result = await query<EventRecord>(
        `INSERT INTO events (room_id, room_ids, name, start_time, end_time) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [primaryRoomId, roomIdsPayload, name, startTime, endTime]
      );
      return normalizeEventRecord(result.rows[0]);
    }

    const { withTransaction } = await import('../config/db');
    return await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO events (room_id, room_ids, name, start_time, end_time) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [primaryRoomId, roomIdsPayload, name, startTime, endTime]
      );
      const event = result.rows[0];

      for (const tableData of tables) {
        const tableRoomId = tableData.roomId || primaryRoomId;
        if (!uniqueRoomIds.includes(tableRoomId)) {
          throw new Error('Table assigned to a room that is not part of this event');
        }
        const tableRes = await client.query(
          `INSERT INTO tables (event_id, room_id, table_number, position) VALUES ($1, $2, $3, $4) RETURNING *`,
          [event.id, tableRoomId, tableData.tableNumber, tableData.position || null]
        );
        const tableId = tableRes.rows[0].id;
        for (let i = 1; i <= tableData.numberOfChairs; i++) {
          await client.query(
            `INSERT INTO chairs (table_id, chair_number) VALUES ($1, $2)`,
            [tableId, String(i)]
          );
        }
      }
      return normalizeEventRecord(event);
    });
  },
  async addTable(eventId: string, tableNumber: string, position: string | null, roomId?: string): Promise<TableRecord> {
    const event = await this.getById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    const tableRoomId = roomId || event.room_id;
    if (!normalizeRoomIds(event.room_ids, event.room_id).includes(tableRoomId)) {
      throw new Error('Table assigned to a room that is not part of this event');
    }
    const result = await query<TableRecord>(
      `INSERT INTO tables (event_id, room_id, table_number, position) VALUES ($1, $2, $3, $4) RETURNING *`,
      [eventId, tableRoomId, tableNumber, position]
    );
    return result.rows[0];
  },
  async addChairs(tableId: string, count: number): Promise<ChairRecord[]> {
    const chairs: ChairRecord[] = [];
    for (let i = 1; i <= count; i++) {
      const result = await query<ChairRecord>(
        `INSERT INTO chairs (table_id, chair_number) VALUES ($1, $2) RETURNING *`,
        [tableId, String(i)]
      );
      chairs.push(result.rows[0]);
    }
    return chairs;
  },
  async update(eventId: string, roomIds: string[], name: string, startTime: Date, endTime: Date): Promise<EventRecord> {
    if (this.isInPast(startTime)) {
      throw new Error('Event start time cannot be in the past');
    }
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }
    const existingEvent = await this.getById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }

    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    if (uniqueRoomIds.length === 0) {
      throw new Error('Select at least one room for this event');
    }

    const ticketsExist = await this.hasTickets(eventId);
    const currentRoomIds = normalizeRoomIds(existingEvent.room_ids, existingEvent.room_id);

    if (ticketsExist && JSON.stringify(currentRoomIds.slice().sort()) !== JSON.stringify(uniqueRoomIds.slice().sort())) {
      throw new Error('Cannot change rooms for an event that has issued tickets');
    }

    for (const roomId of uniqueRoomIds) {
      const isAvailable = await this.checkRoomAvailability(roomId, startTime, endTime, eventId);
      if (!isAvailable) {
        throw new Error('One or more selected rooms are already booked during this time');
      }
    }

    const primaryRoomId = uniqueRoomIds[0];
    const roomIdsPayload = JSON.stringify(uniqueRoomIds);
    const result = await query<EventRecord>(
      `UPDATE events 
       SET room_id = $1, room_ids = $2, name = $3, start_time = $4, end_time = $5
       WHERE id = $6 RETURNING *`,
      [primaryRoomId, roomIdsPayload, name, startTime, endTime, eventId]
    );
    return normalizeEventRecord(result.rows[0]);
  },
  async delete(eventId: string): Promise<void> {
    const ticketsExist = await this.hasTickets(eventId);
    if (ticketsExist) {
      throw new Error('Cannot delete an event that has issued tickets');
    }
    await query(`DELETE FROM events WHERE id = $1`, [eventId]);
  }
}; 