import { query } from '../config/db';
export interface EventRecord {
  id: string;
  room_id: string;
  name: string;
  start_time: Date;
  end_time: Date;
  created_at: Date;
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
export const EventsService = {
  async listAll(): Promise<EventRecord[]> {
    const result = await query<EventRecord>(
      `SELECT * FROM events ORDER BY start_time ASC`
    );
    return result.rows;
  },
  async listForGateStaff(userId: string): Promise<EventRecord[]> {
    const result = await query<EventRecord>(
      `SELECT e.* 
       FROM events e
       JOIN gate_staff_assignments gsa ON e.id = gsa.event_id
       WHERE gsa.user_id = $1
       ORDER BY e.start_time ASC`,
      [userId]
    );
    return result.rows;
  },
  async getById(eventId: string): Promise<EventRecord | null> {
    const result = await query<EventRecord>(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
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
               WHERE room_id = $1 
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
  async create(roomId: string, name: string, startTime: Date, endTime: Date, tables?: { tableNumber: string; position?: string; numberOfChairs: number }[]): Promise<EventRecord> {
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }
    const isAvailable = await this.checkRoomAvailability(roomId, startTime, endTime);
    if (!isAvailable) {
      throw new Error('Room is already booked during this time');
    }

    if (!tables || tables.length === 0) {
      const result = await query<EventRecord>(
        `INSERT INTO events (room_id, name, start_time, end_time) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [roomId, name, startTime, endTime]
      );
      return result.rows[0];
    }

    // Use withTransaction if tables are provided
    const { withTransaction } = await import('../config/db');
    return await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO events (room_id, name, start_time, end_time) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [roomId, name, startTime, endTime]
      );
      const event = result.rows[0];

      for (const tableData of tables) {
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
      return event;
    });
  },
  async addTable(eventId: string, tableNumber: string, position: string | null): Promise<TableRecord> {
    const result = await query<TableRecord>(
      `INSERT INTO tables (event_id, table_number, position) VALUES ($1, $2, $3) RETURNING *`,
      [eventId, tableNumber, position]
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
  async update(eventId: string, roomId: string, name: string, startTime: Date, endTime: Date): Promise<EventRecord> {
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }
    const existingEvent = await this.getById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }
    // Check if tickets exist
    const ticketsExist = await this.hasTickets(eventId);
    
    // If tickets exist, roomId cannot be changed
    if (ticketsExist && existingEvent.room_id !== roomId) {
      throw new Error('Cannot change room for an event that has issued tickets');
    }
    // Check availability if time or room changed
    if (existingEvent.room_id !== roomId || 
        existingEvent.start_time.getTime() !== startTime.getTime() || 
        existingEvent.end_time.getTime() !== endTime.getTime()) {
      
      const isAvailable = await this.checkRoomAvailability(roomId, startTime, endTime, eventId);
      if (!isAvailable) {
        throw new Error('Room is already booked during this time');
      }
    }
    const result = await query<EventRecord>(
      `UPDATE events 
       SET room_id = $1, name = $2, start_time = $3, end_time = $4
       WHERE id = $5 RETURNING *`,
      [roomId, name, startTime, endTime, eventId]
    );
    return result.rows[0];
  },
  async delete(eventId: string): Promise<void> {
    const ticketsExist = await this.hasTickets(eventId);
    if (ticketsExist) {
      throw new Error('Cannot delete an event that has issued tickets');
    }
    await query(`DELETE FROM events WHERE id = $1`, [eventId]);
  }
}; 