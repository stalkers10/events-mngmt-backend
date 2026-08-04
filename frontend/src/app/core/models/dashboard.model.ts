export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  floor_number: number;
  capacity: number | null;
  created_at: string;
}

export interface EventSummary {
  id: string;
  room_id: string;
  room_ids?: string[];
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}
export interface Building {
  id: string;
  name: string;
  address: string | null;
}
