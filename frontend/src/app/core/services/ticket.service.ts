import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TicketDetails {
  id: string;
  reservation_id: string;
  qr_token: string;
  status: string;
  issued_at: string;
  checked_in_at: string | null;
  event_id: string;
  event_name: string;
  start_time: string;
  invitee_name: string;
  room_number: string;
  floor_number: number;
  table_number: string;
  chair_number: string;
  reservation_type: string;
  paired_table_number: string | null;
  paired_chair_number: string | null;
}

export interface TicketScanResult {
  success: boolean;
  message: string;
  details?: TicketDetails;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly baseUrl = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  scanTicket(qrToken: string): Observable<TicketScanResult> {
    return this.http.post<TicketScanResult>(`${this.baseUrl}/scan`, { qrToken });
  }
}
