import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18nextPipe } from '../../../core/pipes/i18next.pipe';
import { I18nextService } from '../../../core/services/i18next.service';
import { ToastService } from '../../../core/services/toast.service';
import { VenueService } from '../../../core/services/venue.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, I18nextPipe],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss'],
})
export class CreateEventComponent {
  eventName = signal('');
  isSubmitting = signal(false);
  submitted = signal(false);

  constructor(
    private router: Router,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService,
  ) {}

  submit(): void {
    this.submitted.set(true);
    const name = this.eventName().trim();

    if (!name) {
      this.toast.error(this.i18n.t('events.nameRequired'));
      return;
    }

    this.isSubmitting.set(true);
    this.venues.createDraft({ name }).subscribe({
      next: (event) => {
        this.isSubmitting.set(false);
        this.toast.success(this.i18n.t('events.draftSaved'));
        // Navigate directly to the edit page so the user can configure it
        this.router.navigate(['/events', event.id, 'edit']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error ?? err?.message;
        this.toast.error(msg || this.i18n.t('errors.createFailed'));
      },
    });
  }
}
