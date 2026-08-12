export interface GateStaffAccount {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
  client_id?: string | null;
  assignments?: { id: string; name: string }[];
}

export interface CreateGateStaffPayload {
  username: string;
  password: string;
  eventIds?: string[];
}
