import { query } from '../config/db';
import { RoleType } from '../types/auth';
import { EntitlementsService } from './entitlements.service';
export const EVENT_GRACE_MINUTES = 30;

export function isEventExpired(endTime: Date | string, now: Date = new Date(), graceMinutes = EVENT_GRACE_MINUTES): boolean {
  const expiryTime = new Date(endTime).getTime() + graceMinutes * 60 * 1000;
  return expiryTime < now.getTime();
}

export interface EventRecord {
  id: string;
  room_id: string;
  room_ids: string[];
  name: string;
  start_time: Date;
  end_time: Date;
  client_id: string | null;
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

// Accept a wide input shape coming from DB rows (which may be typed as EventRecord)
export function normalizeEventRecord(event: any): EventRecord {
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
    client_id: typeof event.client_id === 'string' ? event.client_id : null,
    created_at: createdAtValue instanceof Date ? createdAtValue : new Date(createdAtValue as string | Date),
  };
}

export interface TableRecord {
  id: string;
  event_id: string;
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

class NotFoundOrForbiddenError extends Error {
  statusCode = 403;
  constructor(msg = 'Event not found or access denied') {
    super(msg);
  }
}

export const EventsService = {
  async list(userRole: RoleType, clientId?: string): Promise<EventRecord[]> {
    let sql = `SELECT * FROM events WHERE end_time + interval '30 minutes' > NOW()`;
    const params: any[] = [];
    
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      params.push(clientId);
      sql += ` AND client_id = $${params.length}`;
    }
    
    sql += ` ORDER BY start_time ASC`;
    const result = await query<EventRecord>(sql, params);
    return result.rows.map((event) => normalizeEventRecord(event));
  },
  
  async listForGateStaff(userId: string, userRole: RoleType, clientId?: string): Promise<EventRecord[]> {
    let sql = `SELECT e.* 
               FROM events e
               JOIN gate_staff_assignments gsa ON e.id = gsa.event_id
               WHERE gsa.user_id = $1
                 AND e.end_time + interval '30 minutes' > NOW()`;
    const params: any[] = [userId];
    
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      params.push(clientId);
      sql += ` AND e.client_id = $${params.length}`;
    }
    
    sql += ` ORDER BY e.start_time ASC`;
    
    const result = await query<EventRecord>(sql, params);
    return result.rows.map((event) => normalizeEventRecord(event));
  },
  
  async getById(eventId: string, userRole: RoleType, clientId?: string): Promise<EventRecord | null> {
    let sql = `SELECT * FROM events WHERE id = $1`;
    const params: any[] = [eventId];
    
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      params.push(clientId);
      sql += ` AND client_id = $${params.length}`;
    }
    
    const result = await query<EventRecord>(sql, params);
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
        `SELECT * FROM chairs WHERE table_id = $1 ORDER BY COALESCE(NULLIF(chair_number, '')::integer, 999999), chair_number`,
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
                   WHERE assigned_room_id = $1
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
  
  async create(roomIds: string[], name: string, startTime: Date, endTime: Date, tables?: { tableNumber: string; position?: string; numberOfChairs: number }[], userRole?: RoleType, clientId?: string): Promise<EventRecord> {
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }

    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    if (uniqueRoomIds.length === 0) {
      throw new Error('Select at least one room for this event');
    }

    // Verify room ownership if CLIENT_ADMIN
    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      for (const roomId of uniqueRoomIds) {
        const roomResult = await query(
          `SELECT r.id FROM rooms r JOIN buildings b ON r.building_id = b.id WHERE r.id = $1 AND b.client_id = $2`,
          [roomId, clientId]
        );
        if (roomResult.rows.length === 0) {
           const e = new Error('One or more selected rooms do not belong to you');
           (e as any).statusCode = 403;
           throw e;
        }
      }
    }

    for (const roomId of uniqueRoomIds) {
      const isAvailable = await this.checkRoomAvailability(roomId, startTime, endTime);
      if (!isAvailable) {
        throw new Error('One or more selected rooms are already booked during this time');
      }
    }

    const primaryRoomId = uniqueRoomIds[0];
    const roomIdsPayload = JSON.stringify(uniqueRoomIds);
    
    // Auto-stamp client_id for CLIENT_ADMIN users, leave null for SUPER_ADMIN
    const effectiveClientId = userRole === RoleType.CLIENT_ADMIN ? clientId : null;

    const { withTransaction } = await import('../config/db');
    return await withTransaction(async (client) => {
      const subscription = effectiveClientId
        ? await EntitlementsService.assertCanCreateEvent(client, effectiveClientId)
        : undefined;
      const result = await client.query(
        `INSERT INTO events (room_id, room_ids, name, start_time, end_time, client_id) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [primaryRoomId, roomIdsPayload, name, startTime, endTime, effectiveClientId]
      );
      const event = result.rows[0];

      if (effectiveClientId && tables && tables.length > 0) {
        await EntitlementsService.assertCanAddTables(client, effectiveClientId, event.id, tables.length);
      }

      for (const tableData of tables ?? []) {
        const tableRes = await client.query(
          `INSERT INTO tables (event_id, table_number, position) VALUES ($1, $2, $3) RETURNING *`,
          [event.id, tableData.tableNumber, tableData.position || null]
        );
        const tableId = tableRes.rows[0].id;
        for (let i = 1; i <= tableData.numberOfChairs; i++) {
          await client.query(
            `INSERT INTO chairs (table_id, chair_number) VALUES ($1, $2)`,
            [tableId, String(i)]
          );
        }
      }
      if (effectiveClientId && subscription) {
        await EntitlementsService.recordEventCreation(client, effectiveClientId, event.id, subscription);
      }
      return normalizeEventRecord(event);
    });
  },
  
  async addTable(eventId: string, tableNumber: string, position: string | null, _roomId: string | undefined, userRole: RoleType, clientId?: string): Promise<TableRecord> {
    if (userRole !== RoleType.CLIENT_ADMIN || !clientId) {
      const result = await query<TableRecord>(
        `INSERT INTO tables (event_id, table_number, position) VALUES ($1, $2, $3) RETURNING *`,
        [eventId, tableNumber, position]
      );
      return result.rows[0];
    }

    const { withTransaction } = await import('../config/db');
    return withTransaction(async (client) => {
      await EntitlementsService.assertCanAddTables(client, clientId, eventId, 1);
      const result = await client.query<TableRecord>(
        `INSERT INTO tables (event_id, table_number, position) VALUES ($1, $2, $3) RETURNING *`,
        [eventId, tableNumber, position]
      );
      return result.rows[0];
    });
  },

  async updateTable(eventId: string, tableId: string, tableNumber: string, position: string | null): Promise<TableRecord> {
    const result = await query<TableRecord>(
      `UPDATE tables SET table_number = $1, position = COALESCE($3, position)
       WHERE id = $2 AND event_id = $4 RETURNING *`,
      [tableNumber, tableId, position, eventId]
    );
    if (result.rows.length === 0) {
      const err = new Error('Table not found');
      (err as any).statusCode = 404;
      throw err;
    }
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
  
  async update(eventId: string, roomIds: string[], name: string, startTime: Date, endTime: Date, userRole: RoleType, clientId?: string): Promise<EventRecord> {
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }
    const existingEvent = await this.getById(eventId, userRole, clientId);
    if (!existingEvent) {
      throw new NotFoundOrForbiddenError();
    }

    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    if (uniqueRoomIds.length === 0) {
      throw new Error('Select at least one room for this event');
    }

    if (userRole === RoleType.CLIENT_ADMIN && clientId) {
      for (const roomId of uniqueRoomIds) {
        const roomResult = await query(
          `SELECT r.id FROM rooms r JOIN buildings b ON r.building_id = b.id WHERE r.id = $1 AND b.client_id = $2`,
          [roomId, clientId]
        );
        if (roomResult.rows.length === 0) {
           const e = new Error('One or more selected rooms do not belong to you');
           (e as any).statusCode = 403;
           throw e;
        }
      }
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
  
  async delete(eventId: string, userRole: RoleType, clientId?: string): Promise<void> {
    const existingEvent = await this.getById(eventId, userRole, clientId);
    if (!existingEvent) {
      throw new NotFoundOrForbiddenError();
    }
    
    const ticketsExist = await this.hasTickets(eventId);
    if (ticketsExist) {
      throw new Error('Cannot delete an event that has issued tickets');
    }
    
    await query(`DELETE FROM events WHERE id = $1`, [eventId]);
  }
};
