import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketTemplateService } from './ticket-template.service';
import { CustomTemplateStore } from './custom-template.store';
import { getMergedCategories } from './template-catalog';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { TicketTemplateHostComponent } from './ticket-template-host.component';
import { sampleSingleTicket, sampleCoupleTicket } from './sample-data';
import { TicketFieldMapping, mappingIsComplete, mappingLabels, validateMappingSelectors } from './template-mapping';

@Component({
  selector: 'app-add-template-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nextPipe, TicketTemplateHostComponent],
  templateUrl: './add-template-wizard.component.html',
  styleUrl: './add-template-wizard.component.scss',
})
export class AddTemplateWizardComponent {
  @Output() created = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  private svc = inject(TicketTemplateService);
  private store = inject(CustomTemplateStore);
  private i18n = inject(I18nextService);

  readonly sampleSingle = sampleSingleTicket;
  readonly sampleCouple = sampleCoupleTicket;
  readonly fallbackHtml = '<div style="padding:20px;text-align:center;color:#666">Type HTML to preview</div>';

  readonly saving = signal(false);
  readonly error = signal('');

  readonly knownTokens = [
    'event_name', 'invitee_name', 'start_date', 'start_time', 'end_date', 'end_time',
    'room_number', 'floor_number', 'table_number', 'chair_number',
    'paired_table_number', 'paired_chair_number', 'seating_label',
    'reservation_type', 'status', 'ticket_id', 'qr_token', 'qr_image',
    'session_1_datetime', 'session_1_location', 'session_2_datetime', 'session_2_location',
    'session_3_datetime', 'session_3_location', 'session_4_datetime', 'session_4_location',
    'session_5_datetime', 'session_5_location', 'session_6_datetime', 'session_6_location',
  ];

  get singleTokenWarning(): string {
    if (!this.singleHtml.trim()) return '';
    const found = this.knownTokens.filter(t => this.singleHtml.includes(`{{${t}}}`));
    return found.length === 0 ? this.i18n.t('ticketTemplates.wizard.noTokensWarning') : '';
  }

  get coupleTokenWarning(): string {
    if (!this.coupleHtml.trim()) return '';
    const found = this.knownTokens.filter(t => this.coupleHtml.includes(`{{${t}}}`));
    return found.length === 0 ? this.i18n.t('ticketTemplates.wizard.noTokensWarning') : '';
  }

  categoryMode: 'existing' | 'new' = 'existing';
  selectedCategory = '';
  newCategory = '';
  themeName = '';
  themeDescription = '';
  singleHtml = '';
  coupleHtml = '';
  singleMapping: TicketFieldMapping = {};
  coupleMapping: TicketFieldMapping = {};
  readonly mappingFields = Object.keys(mappingLabels) as (keyof TicketFieldMapping)[];

  categories() {
    return getMergedCategories(this.store.templates());
  }

  categoryLabel(id: string): string {
    const c = this.categories().find((x) => x.id === id);
    if (!c) return id;
    return c.label ?? this.i18n.t(c.nameKey);
  }

  onFileSelected(event: Event, type: 'single' | 'couple'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (type === 'single') {
        this.singleHtml = text;
      } else {
        this.coupleHtml = text;
      }
    };
    reader.readAsText(file);
  }

  mappingLabel(field: keyof TicketFieldMapping): string {
    return mappingLabels[field];
  }

  mappingPlaceholder(field: keyof TicketFieldMapping): string {
    const examples: Record<keyof TicketFieldMapping, string> = {
      guest: 'CoupleNames',
      eventName: 'EventLocation#2',
      start: 'EventDateTitle#1',
      end: 'EventDateTitle#2',
      venue: 'EventLocation#1',
      seating: 'PleaseRespondViaOurWebsiteMe26weddingComIndexPhpRsvp',
      qr: 'QrCodeContainer',
      session1Start: 'EventDateTitle#1',
      session1Venue: 'EventLocation#1',
      session2Start: 'EventDateTitle#2',
      session2Venue: 'EventLocation#2',
    };
    return examples[field];
  }

  submit(): void {
    this.error.set('');
    const category = this.categoryMode === 'new' ? this.newCategory.trim() : this.selectedCategory;
    if (!category) {
      this.error.set(this.i18n.t('ticketTemplates.wizard.categoryRequired'));
      return;
    }
    if (!this.themeName.trim()) {
      this.error.set(this.i18n.t('ticketTemplates.wizard.themeRequired'));
      return;
    }
    if (!this.singleHtml.trim()) {
      this.error.set(this.i18n.t('ticketTemplates.wizard.singleRequired'));
      return;
    }
    if (!this.coupleHtml.trim()) {
      this.error.set(this.i18n.t('ticketTemplates.wizard.coupleRequired'));
      return;
    }
    if (!mappingIsComplete(this.singleMapping) || !mappingIsComplete(this.coupleMapping)) {
      this.error.set('Map Guest name, Event name, Start date & time, Seating, and QR-code frame for both tickets before saving.');
      return;
    }
    const mappingError = validateMappingSelectors(this.singleHtml, this.singleMapping)
      ?? validateMappingSelectors(this.coupleHtml, this.coupleMapping);
    if (mappingError) {
      this.error.set(mappingError);
      return;
    }
    this.saving.set(true);
    this.svc
      .createTemplate({
        category,
        themeName: this.themeName.trim(),
        themeDescription: this.themeDescription.trim() || null,
        singleHtml: this.singleHtml,
        coupleHtml: this.coupleHtml,
        singleMapping: this.singleMapping,
        coupleMapping: this.coupleMapping,
      })
      .subscribe({
        next: () => this.created.emit(),
        error: () => {
          this.error.set(this.i18n.t('ticketTemplates.wizard.createError'));
          this.saving.set(false);
        },
      });
  }
}
