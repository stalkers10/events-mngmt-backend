import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientFilterService } from '../../../core/services/client-filter.service';
import { I18nextPipe } from '../../../core/pipes/i18next.pipe';

@Component({
  selector: 'app-client-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nextPipe],
  template: `
    <div class="client-selector" *ngIf="clients().length > 0">
      <span class="material-symbols-outlined icon">domain</span>
      <select 
        class="glass-select" 
        [ngModel]="selectedClientId()" 
        (ngModelChange)="onClientChange($event)">
        <option [ngValue]="null">{{ 'common.allClients' | translate }}</option>
        <option *ngFor="let client of clients()" [ngValue]="client.id">
          {{ client.name }}
        </option>
      </select>
    </div>
  `,
  styles: [`
    .client-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.25rem 0.5rem;
      backdrop-filter: blur(10px);
    }
    .icon {
      font-size: 1.1rem;
      color: var(--text-muted);
    }
    .glass-select {
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
      appearance: none;
      padding-right: 1.5rem;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 0.2rem top 50%;
      background-size: 0.65rem auto;
    }
    .glass-select option {
      background: var(--bg-surface);
      color: var(--text-primary);
    }
  `]
})
export class ClientSelectorComponent {
  clients;
  selectedClientId;

  constructor(private clientFilterService: ClientFilterService) {
    this.clients = computed(() => this.clientFilterService.clients());
    this.selectedClientId = computed(() => this.clientFilterService.selectedClientId());
  }

  onClientChange(clientId: string | null) {
    this.clientFilterService.setClientFilter(clientId);
  }
}
