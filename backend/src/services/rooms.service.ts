import { query } from '../config/db';
export interface RoomRecord {
  id: string;
  building_id: string;
  room_number: string;
  floor_number: number;
  capacity: number | null;
  created_at: Date;
}
export const RoomsService = {
  async createRoom(buildingId: string, roomNumber: string, floorNumber: number, capacity?: number): Promise<RoomRecord> {
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
  async listRooms(buildingId?: string): Promise<RoomRecord[]> {
    let sql = `SELECT * FROM rooms`;
    const params: any[] = [];
    if (buildingId) {
      sql += ` WHERE building_id = $1`;
      params.push(buildingId);
    }
    sql += ` ORDER BY floor_number ASC, room_number ASC`;
    const result = await query<RoomRecord>(sql, params);
    return result.rows;
  },
  async getRoomDetails(roomId: string): Promise<any> {
    const roomResult = await query<RoomRecord>(`SELECT * FROM rooms WHERE id = $1`, [roomId]);
    if (roomResult.rows.length === 0) return null;
    return roomResult.rows[0];
  }
};