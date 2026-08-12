import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  constructor(private http: HttpClient) {}

  getClients(): Observable<ClientRecord[]> {
    return this.http.get<ClientRecord[]>(`${environment.apiUrl}/clients`);
  }

  createClient(username: string, password: string, name: string, email: string, phone?: string): Observable<ClientRecord> {
    return this.http.post<ClientRecord>(`${environment.apiUrl}/clients`, { username, password, name, email, phone });
  }

  updateClient(id: string, name: string, email: string, phone?: string): Observable<ClientRecord> {
    return this.http.put<ClientRecord>(`${environment.apiUrl}/clients/${id}`, { name, email, phone });
  }

  deactivateClient(id: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/clients/${id}/deactivate`, {});
  }

  reactivateClient(id: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/clients/${id}/reactivate`, {});
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/clients/${id}`);
  }
}
