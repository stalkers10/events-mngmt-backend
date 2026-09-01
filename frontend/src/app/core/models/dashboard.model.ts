export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  floor_number: number;
  capacity: number | null;
  created_at: string;
}

export interface EventSession {
  label: string;
  datetime: string;
  location: string;
}

export interface EventSummary {
  id: string;
  room_id?: string | null;
  room_ids?: string[];
  name: string;
  start_time?: string | null;
  end_time?: string | null;
  client_id?: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  created_at: string;
  ticket_template_single?: string;
  ticket_template_couple?: string;
  sessions?: EventSession[];
}
export interface Building {
  id: string;
  name: string;
  address: string | null;
  client_id?: string | null;
}
