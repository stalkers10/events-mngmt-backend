import { query } from '../config/db';

export interface RoomRecord {
  id: string;
  building_id: string;
  room_number: string;
  floor_number: number;
  capacity: number | null;
  created_at: Date;
}

class NotFoundOrForbiddenError extends Error {
  statusCode = 403;
  constructor() { super('Room not found or access denied'); }
}

export const RoomsService = {
  async createRoom(
    buildingId: string,
    roomNumber: string,
    floorNumber: number,
    capacity?: number,
    clientId?: string
  ): Promise<RoomRecord> {
    // If clientId is provided, verify the building belongs to this client
    if (clientId) {
      const buildingResult = await query(
        `SELECT id FROM buildings WHERE id = $1 AND client_id = $2`,
        [buildingId, clientId]
      );
      if (buildingResult.rows.length === 0) {
        throw new NotFoundOrForbiddenError();
      }
    }

    try {
      const result = await query<RoomRecord>(
        `INSERT INTO rooms (building_id, room_number, floor_number, capacity) VALUES ($1, $2, $3, $4) RETURNING *`,
        [buildingId, roomNumber, floorNumber, capacity || null]
      );
      return result.rows[0];
    } catch (err: any) {
      if (err.code === '23505') { // Unique constraint violation
        throw new Error('Room number already exists in this building');
      }
      throw err;
    }
  },

  async listRooms(buildingId?: string, clientId?: string): Promise<RoomRecord[]> {
    let sql = `
      SELECT r.* FROM rooms r
      ${clientId ? 'JOIN buildings b ON r.building_id = b.id' : ''}
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (clientId) {
      params.push(clientId);
      sql += ` AND b.client_id = $${params.length}`;
    }
    
    if (buildingId) {
      params.push(buildingId);
      sql += ` AND r.building_id = $${params.length}`;
    }
    
    sql += ` ORDER BY r.floor_number ASC, r.room_number ASC`;
    const result = await query<RoomRecord>(sql, params);
    return result.rows;
  },

  async getRoomDetails(roomId: string, clientId?: string): Promise<any> {
    let sql = `
      SELECT r.* FROM rooms r
      ${clientId ? 'JOIN buildings b ON r.building_id = b.id' : ''}
      WHERE r.id = $1
    `;
    const params: any[] = [roomId];
    
    if (clientId) {
      params.push(clientId);
      sql += ` AND b.client_id = $${params.length}`;
    }

    const roomResult = await query<RoomRecord>(sql, params);
    if (roomResult.rows.length === 0) return null;
    return roomResult.rows[0];
  },

  async deleteRoom(roomId: string, clientId?: string): Promise<void> {
    if (clientId) {
      const roomResult = await query(
        `SELECT r.id FROM rooms r
         JOIN buildings b ON r.building_id = b.id
         WHERE r.id = $1 AND b.client_id = $2`,
        [roomId, clientId]
      );
      if (roomResult.rows.length === 0) throw new NotFoundOrForbiddenError();
    }
    
    await query(`DELETE FROM rooms WHERE id = $1`, [roomId]);
  }
};