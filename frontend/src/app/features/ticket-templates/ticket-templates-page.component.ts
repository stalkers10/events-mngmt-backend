import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TicketTemplateService } from './ticket-template.service';
import {
  getMergedCategories,
  getMergedGroupThemes,
  getMergedTemplates,
  getCategory,
  getGroupTheme,
} from './template-catalog';
import { TicketTemplateHostComponent } from './ticket-template-host.component';
import { AddTemplateWizardComponent } from './add-template-wizard.component';
import { CustomTemplateStore } from './custom-template.store';
import { sampleCoupleTicket } from './sample-data';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';

type Step = 'categories' | 'themes' | 'templates';

@Component({
  selector: 'app-ticket-templates-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TicketTemplateHostComponent, I18nextPipe, AddTemplateWizardComponent],
  templateUrl: './ticket-templates-page.component.html',
  styleUrl: './ticket-templates-page.component.scss',
})
export class TicketTemplatesPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(TicketTemplateService);
  private store = inject(CustomTemplateStore);
  private toast = inject(ToastService);
  private i18n = inject(I18nextService);

  readonly sample = sampleCoupleTicket;
  readonly customTemplates = this.store.templates;

  readonly step = signal<Step>('categories');
  readonly selectedCategoryId = signal<string>('');
  readonly selectedThemeId = signal<string>('');
  readonly currentSingle = signal<string>('classic');
  readonly currentCouple = signal<string>('classic');
  readonly selectedSingle = signal<string>('classic');
  readonly selectedCouple = signal<string>('classic');
  readonly saving = signal(false);
  readonly previewDesignId = signal<string | null>(null);
  readonly wizardOpen = signal(false);

  eventId = '';

  ngOnInit(): void {
    this.store.load();
    const id = this.route.snapshot.paramMap.get('eventId');
    if (!id) {
      this.router.navigate(['/events']);
      return;
    }
    this.eventId = id;
    this.svc.getEvent(id).subscribe({
      next: (ev) => {
        const s = ev?.ticket_template_single || 'classic';
        const c = ev?.ticket_template_couple || 'classic';
        this.currentSingle.set(s);
        this.currentCouple.set(c);
        this.selectedSingle.set(s);
        this.selectedCouple.set(c);
      },
      error: () => {
        this.currentSingle.set('classic');
        this.currentCouple.set('classic');
        this.selectedSingle.set('classic');
        this.selectedCouple.set('classic');
      },
    });
  }

  categories() {
    return getMergedCategories(this.customTemplates());
  }

  themesForCategory() {
    return getMergedGroupThemes(this.customTemplates()).filter((t) => t.categoryId === this.selectedCategoryId());
  }

  templatesForTheme() {
    const all = getMergedTemplates(this.customTemplates());
    return all
      .filter((t) => t.groupThemeId === this.selectedThemeId())
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'single' ? -1 : 1));
  }

  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.step.set('themes');
  }

  selectTheme(id: string): void {
    this.selectedThemeId.set(id);
    this.step.set('templates');

    // Auto-select this theme's single & couple templates so "Choose Combo"
    // immediately applies the correct theme without requiring an extra click.
    const all = getMergedTemplates(this.customTemplates());
    const themeTemplates = all.filter((t) => t.groupThemeId === id);
    const single = themeTemplates.find(t => t.type === 'single');
    const couple = themeTemplates.find(t => t.type === 'couple');
    if (single) this.selectedSingle.set(single.designId);
    if (couple) this.selectedCouple.set(couple.designId);
  }

  backToCategories(): void {
    this.step.set('categories');
  }

  backToThemes(): void {
    this.step.set('themes');
  }

  categoryName(): string {
    const c = getCategory(this.selectedCategoryId()) ?? this.categories().find((x) => x.id === this.selectedCategoryId());
    if (!c) return '';
    return c.label ?? this.i18n.t(c.nameKey);
  }

  themeName(): string {
    const t = getGroupTheme(this.selectedThemeId()) ?? this.themesForCategory().find((x) => x.id === this.selectedThemeId());
    if (!t) return '';
    return t.label ?? this.i18n.t(t.nameKey);
  }

  nameOf(item: { label?: string; nameKey: string }): string {
    return item.label ?? this.i18n.t(item.nameKey);
  }

  descOf(item: { label?: string; descriptionKey: string }): string {
    return (item as any).label ? '' : this.i18n.t(item.descriptionKey);
  }

  isSaved(type: 'single' | 'couple', designId: string): boolean {
    return (type === 'single' ? this.currentSingle() : this.currentCouple()) === designId;
  }

  isSelected(type: 'single' | 'couple', designId: string): boolean {
    return (type === 'single' ? this.selectedSingle() : this.selectedCouple()) === designId;
  }

  pick(type: 'single' | 'couple', designId: string): void {
    const themeTemplates = this.templatesForTheme();
    if (type === 'single') {
      this.selectedSingle.set(designId);
      const other = themeTemplates.find(t => t.type === 'couple');
      if (other) this.selectedCouple.set(other.designId);
    } else {
      this.selectedCouple.set(designId);
      const other = themeTemplates.find(t => t.type === 'single');
      if (other) this.selectedSingle.set(other.designId);
    }
  }

  chooseCombo(): void {
    if (this.saving()) return;
    const newSingle = this.selectedSingle();
    const newCouple = this.selectedCouple();

    // Don't call the API if nothing changed
    if (newSingle === this.currentSingle() && newCouple === this.currentCouple()) {
      this.toast.success(this.i18n.t('ticketTemplates.alreadyCurrent') || 'This template is already active for this event.');
      return;
    }

    this.saving.set(true);
    this.svc
      .setTemplates(this.eventId, newSingle, newCouple)
      .subscribe({
        next: (ev) => {
          // Use server response to confirm what was actually saved
          const savedSingle = ev?.ticket_template_single || newSingle;
          const savedCouple = ev?.ticket_template_couple || newCouple;
          this.currentSingle.set(savedSingle);
          this.currentCouple.set(savedCouple);
          this.selectedSingle.set(savedSingle);
          this.selectedCouple.set(savedCouple);
          this.toast.success(this.i18n.t('ticketTemplates.saved'));
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.error || this.i18n.t('ticketTemplates.saveError'));
          this.saving.set(false);
        },
      });
  }

  openWizard(): void {
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
  }

  onTemplateCreated(): void {
    this.wizardOpen.set(false);
    this.store.refresh();
    this.toast.success(this.i18n.t('ticketTemplates.created'));
  }

  openPreview(designId: string): void {
    this.previewDesignId.set(designId);
  }

  closePreview(): void {
    this.previewDesignId.set(null);
  }
}
