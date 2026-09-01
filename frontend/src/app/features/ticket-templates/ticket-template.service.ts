import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TicketTemplateService {
  private readonly base = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getEvent(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${eventId}`);
  }

  setTemplates(eventId: string, singleId: string, coupleId: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/${eventId}/ticket-template`, {
      singleTemplateId: singleId,
      coupleTemplateId: coupleId,
    });
  }

  private readonly tmplBase = `${environment.apiUrl}/ticket-templates`;

  listTemplates(): Observable<any[]> {
    return this.http.get<any[]>(this.tmplBase);
  }

  getTemplate(id: string): Observable<any> {
    return this.http.get<any>(`${this.tmplBase}/${id}`);
  }

  createTemplate(payload: {
    category: string;
    themeName: string;
    themeDescription?: string | null;
    singleHtml: string;
    coupleHtml: string;
    singleMapping: Record<string, string>;
    coupleMapping: Record<string, string>;
  }): Observable<any> {
    return this.http.post<any>(this.tmplBase, payload);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.tmplBase}/${id}`);
  }
}
