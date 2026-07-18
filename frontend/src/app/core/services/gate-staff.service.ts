import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GateStaffAccount, CreateGateStaffPayload } from '../models/gate-staff.model';

@Injectable({ providedIn: 'root' })
export class GateStaffService {
  private readonly baseUrl = `${environment.apiUrl}/gate-staff`;

  constructor(private http: HttpClient) {}

  list(): Observable<GateStaffAccount[]> {
    return this.http.get<GateStaffAccount[]>(this.baseUrl);
  }

  create(payload: CreateGateStaffPayload): Observable<{ id: string; username: string }> {
    return this.http.post<{ id: string; username: string }>(this.baseUrl, payload);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  reactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/reactivate`, {});
  }
}
