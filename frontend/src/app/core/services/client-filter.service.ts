import { Injectable, signal, computed } from '@angular/core';
import { ClientRecord, ClientService } from './client.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientFilterService {
  readonly clients = signal<ClientRecord[]>([]);
  readonly selectedClientId = signal<string | null>(null);

  constructor(private clientService: ClientService, private authService: AuthService) {
    if (this.authService.isSuperAdmin()) {
      this.loadClients();
    }
  }

  loadClients() {
    this.clientService.getClients().subscribe({
      next: (data) => this.clients.set(data),
      error: (err) => console.error('Failed to load clients for filter', err)
    });
  }

  setClientFilter(clientId: string | null) {
    this.selectedClientId.set(clientId);
  }

  /**
   * Helper function to filter an array of objects that have a client_id property.
   * If the user is a Super Admin and has selected a specific client, this will filter the array.
   * Otherwise, it returns the array unmodified.
   */
  filterList<T extends { client_id?: string | null }>(list: T[]): T[] {
    const selected = this.selectedClientId();
    if (!this.authService.isSuperAdmin() || !selected) {
      return list;
    }
    return list.filter(item => item.client_id === selected);
  }
}
