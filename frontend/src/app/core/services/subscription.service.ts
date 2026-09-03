import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubscriptionPlan, SubscriptionSummary, SubscriptionUsage, Invoice } from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private http: HttpClient) {}

  plans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${environment.apiUrl}/billing/plans`);
  }

  subscription(): Observable<SubscriptionSummary> {
    return this.http.get<SubscriptionSummary>(`${environment.apiUrl}/billing/subscription`);
  }

  usage(): Observable<SubscriptionUsage> {
    return this.http.get<SubscriptionUsage>(`${environment.apiUrl}/billing/usage`);
  }

  invoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${environment.apiUrl}/billing/invoices`);
  }

  checkout(planCode: 'GO' | 'PRO', phone: string): Observable<{ paymentId: string; reference: string; status: string; ussdCode?: string }> {
    return this.http.post<{ paymentId: string; reference: string; status: string; ussdCode?: string }>(`${environment.apiUrl}/billing/checkout`, { planCode, phone });
  }

  paymentStatus(paymentId: string): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.apiUrl}/billing/payments/${paymentId}`);
  }

  reconcilePendingPayments(): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/billing/payments/reconcile`, {});
  }

  cancelAtPeriodEnd(): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${environment.apiUrl}/billing/cancel`, {});
  }

  resumeRenewal(): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${environment.apiUrl}/billing/resume`, {});
  }

  // ---- Super Admin: manage a specific client's subscription ----
  adminSubscription(clientId: string): Observable<SubscriptionSummary> {
    return this.http.get<SubscriptionSummary>(`${environment.apiUrl}/billing/admin/subscription?clientId=${encodeURIComponent(clientId)}`);
  }

  adminUsage(clientId: string): Observable<SubscriptionUsage> {
    return this.http.get<SubscriptionUsage>(`${environment.apiUrl}/billing/admin/usage?clientId=${encodeURIComponent(clientId)}`);
  }

  adminPayments(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/billing/admin/payments?clientId=${encodeURIComponent(clientId)}`);
  }

  adminCancel(clientId: string): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${environment.apiUrl}/billing/admin/cancel`, { clientId });
  }

  adminResume(clientId: string): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${environment.apiUrl}/billing/admin/resume`, { clientId });
  }

  adminGrant(clientId: string, planCode: string, periodMonths?: number): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${environment.apiUrl}/billing/admin/grant`, { clientId, planCode, periodMonths });
  }
}
