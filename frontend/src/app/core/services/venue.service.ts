import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Building, EventSummary, Room } from '../models/dashboard.model';

export interface CreateBuildingPayload {
  name: string;
  address?: string;
}

export interface CreateRoomPayload {
  buildingId: string;
  roomNumber: string;
  floorNumber: number;
  capacity?: number;
}

export interface CreateEventPayload {
  roomIds: string[];
  roomId?: string;
  name: string;
  startTime: string;
  endTime: string;
  tables?: {
    tableNumber: string;
    position?: string;
    numberOfChairs: number;
  }[];
}

export interface CreateTablePayload {
  tableNumber: string;
  position?: string;
}

export interface UpdateTablePayload {
  tableNumber: string;
  position?: string;
}

export interface CreateChairsPayload {
  count: number;
}

@Injectable({ providedIn: 'root' })
export class VenueService {
  constructor(private http: HttpClient) {}

  buildings(): Observable<Building[]> {
    return this.http.get<Building[]>(`${environment.apiUrl}/buildings`);
  }
  deleteBuilding(buildingId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/buildings/${buildingId}`);
  }

  rooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${environment.apiUrl}/rooms`);
  }

  deleteRoom(roomId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/rooms/${roomId}`);
  }

  createBuilding(payload: CreateBuildingPayload): Observable<Building> {
    return this.http.post<Building>(`${environment.apiUrl}/buildings`, payload);
  }

  createRoom(payload: CreateRoomPayload): Observable<Room> {
    return this.http.post<Room>(`${environment.apiUrl}/rooms`, payload);
  }

  createEvent(payload: CreateEventPayload): Observable<EventSummary> {
    return this.http.post<EventSummary>(`${environment.apiUrl}/events`, payload);
  }

  deleteEvent(eventId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/events/${eventId}`);
  }

  event(eventId: string): Observable<EventSummary> {
    return this.http.get<EventSummary>(`${environment.apiUrl}/events/${eventId}`);
  }

  occupancy(eventId: string): Observable<EventOccupancy> {
    return this.http.get<EventOccupancy>(`${environment.apiUrl}/reservations/event/${eventId}/occupancy`);
  }

  // Table management
  addTable(eventId: string, payload: CreateTablePayload): Observable<any> {
    return this.http.post(`${environment.apiUrl}/events/${eventId}/tables`, payload);
  }

  updateTable(eventId: string, tableId: string, payload: UpdateTablePayload): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/events/${eventId}/tables/${tableId}`, payload);
  }

  addChairs(eventId: string, tableId: string, payload: CreateChairsPayload): Observable<any> {
    return this.http.post(`${environment.apiUrl}/events/${eventId}/tables/${tableId}/chairs`, payload);
  }

  createReservation(payload: {
    eventId: string;
    tableId: string;
    chairId: string;
    pairedChairId?: string;
    roomId?: string;
    type?: 'SINGLE' | 'COUPLE';
    invitee: { name: string; email?: string; phone?: string };
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/reservations`, payload);
  }

  cancelReservation(reservationId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/reservations/${reservationId}`);
  }

  getTicketDetails(ticketId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/tickets/${ticketId}`);
  }

  downloadTicketPdf(ticketId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/tickets/${ticketId}/pdf`, { responseType: 'blob' });
  }
}

export interface OccupancyChair {
  id: string;
  table_id: string;
  chair_number: string;
  reservation_id: string | null;
  reservation_status: 'ACTIVE' | null;
  reservation_room_id: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  ticket_id: string | null;
  ticket_status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | null;
}

export interface OccupancyTable {
  id: string;
  room_id: string | null;
  table_number: string;
  position: string | null;
  chairs: OccupancyChair[];
}

export interface EventOccupancy {
  tables: OccupancyTable[];
}
