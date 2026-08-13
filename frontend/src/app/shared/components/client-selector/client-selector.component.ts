import { Component, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientFilterService } from '../../../core/services/client-filter.service';
import { I18nextService } from '../../../core/services/i18next.service';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';

@Component({
  selector: 'app-client-selector',
  standalone: true,
  imports: [CommonModule, CustomSelectComponent],
  template: `
    <div class="client-selector" *ngIf="clients().length > 0">
      <app-custom-select
        [options]="selectorOptions()"
        [selected]="selectedClientId()"
        [placeholder]="i18n.t('common.allClients')"
        [fullWidth]="fullWidth"
        (selectedChange)="onClientChange($event)">
      </app-custom-select>
    </div>
  `,
  styles: [`
    .client-selector {
      display: block;
      width: 100%;
    }
  `]
})
export class ClientSelectorComponent {
  @Input() fullWidth = false;

  readonly clients;
  readonly selectedClientId;

  constructor(
    private clientFilterService: ClientFilterService,
    public i18n: I18nextService
  ) {
    this.clients = computed(() => this.clientFilterService.clients());
    this.selectedClientId = computed(() => this.clientFilterService.selectedClientId());
  }

  readonly selectorOptions = computed<SelectOption[]>(() => [
    { value: null, label: this.i18n.t('common.allClients'), icon: 'group' },
    ...this.clients().map((c) => ({ value: c.id, label: c.name, icon: 'person' })),
  ]);

  onClientChange(clientId: string | null) {
    this.clientFilterService.setClientFilter(clientId);
  }
}
