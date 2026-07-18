import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventSummary, Room, Building } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  rooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${environment.apiUrl}/rooms`);
  }

  events(): Observable<EventSummary[]> {
    return this.http.get<EventSummary[]>(`${environment.apiUrl}/events`);
  }

  buildings(): Observable<Building[]> {
    return this.http.get<Building[]>(`${environment.apiUrl}/buildings`);
  }
}
