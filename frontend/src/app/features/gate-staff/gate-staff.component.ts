import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { GateStaffService } from '../../core/services/gate-staff.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { GateStaffAccount } from '../../core/models/gate-staff.model';
import { EventSummary } from '../../core/models/dashboard.model';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { describeHttpError } from '../../core/utils/http-error.util';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-gate-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, I18nextPipe, ConfirmationDialogComponent],
  templateUrl: './gate-staff.component.html',
  styleUrl: './gate-staff.component.scss',
})
export class GateStaffComponent implements OnInit {
  form;

  staff = signal<GateStaffAccount[]>([]);
  searchQuery = signal('');
  filteredStaff = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.staff();

    return this.staff().filter((account) =>
      account.username.toLowerCase().includes(query) ||
      account.assignments?.some((assignment) => assignment.name.toLowerCase().includes(query))
    );
  });
  events = signal<EventSummary[]>([]);
  isLoadingList = signal(true);
  isSubmitting = signal(false);
  processingId = signal<string | null>(null);

  activeAssignAccount = signal<GateStaffAccount | null>(null);
  activeRemoveAssignment = signal<{ account: GateStaffAccount; assignment: { id: string; name: string } } | null>(null);
  selectedEventId = '';

  readonly showDeactivateConfirmation = signal(false);
  readonly pendingDeactivateAccount = signal<GateStaffAccount | null>(null);
  readonly showDeleteConfirmation = signal(false);
  readonly pendingDeleteAccount = signal<GateStaffAccount | null>(null);

  constructor(
    private fb: FormBuilder,
    private gateStaffService: GateStaffService,
    private dashboardService: DashboardService,
    private toast: ToastService,
    public translation: I18nextService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    this.loadStaff();
    this.loadEvents();
  }

  loadEvents(): void {
    this.dashboardService.events().subscribe({
      next: (events) => this.events.set(events),
      error: () => this.toast.error(this.translation.t('errors.loadFailed')),
    });
  }

  loadStaff(): void {
    this.isLoadingList.set(true);
    this.gateStaffService.list().subscribe({
      next: (staff) => {
        this.staff.set(staff);
        this.isLoadingList.set(false);
      },
      error: (err) => {
        this.isLoadingList.set(false);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);

    const { username, password } = this.form.getRawValue();

    this.gateStaffService.create({ username: username!, password: password! }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(this.translation.t('gateStaff.createdToast', { username: username! }));
        this.form.reset();
        this.loadStaff();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const description = describeHttpError(err, 'gateStaffCreate');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  deactivate(account: GateStaffAccount): void {
    this.pendingDeactivateAccount.set(account);
    this.showDeactivateConfirmation.set(true);
  }

  closeDeactivateConfirmation(): void {
    this.showDeactivateConfirmation.set(false);
    this.pendingDeactivateAccount.set(null);
  }

  confirmDeactivate(): void {
    const account = this.pendingDeactivateAccount();
    if (!account) return;

    this.showDeactivateConfirmation.set(false);
    this.pendingDeactivateAccount.set(null);

    this.processingId.set(account.id);
    this.gateStaffService.deactivate(account.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(
          this.translation.t('gateStaff.deactivatedToast', { username: account.username })
        );
        this.loadStaff();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'gateStaffAction');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  reactivate(account: GateStaffAccount): void {
    this.processingId.set(account.id);
    this.gateStaffService.reactivate(account.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(
          this.translation.t('gateStaff.reactivatedToast', { username: account.username })
        );
        this.loadStaff();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'gateStaffAction');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  openAssignModal(account: GateStaffAccount): void {
    if (!account.is_active) {
      this.toast.error(this.translation.t('errors.forbidden'));
      return;
    }
    this.activeAssignAccount.set(account);
    this.selectedEventId = '';
  }

  closeAssignModal(): void {
    this.activeAssignAccount.set(null);
    this.selectedEventId = '';
  }

  getAvailableEvents(account: GateStaffAccount): EventSummary[] {
    const assignedIds = new Set((account.assignments || []).map(a => a.id));
    return this.events().filter(e => !assignedIds.has(e.id));
  }

  assignEvent(): void {
    const account = this.activeAssignAccount();
    const eventId = this.selectedEventId;
    if (!account || !eventId) return;

    this.processingId.set(account.id);
    this.gateStaffService.assignToEvent(account.id, eventId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(
          this.translation.t('gateStaff.assignedSuccess', { username: account.username }) || 'Staff assigned successfully'
        );
        this.closeAssignModal();
        this.loadStaff();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'gateStaffAction');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  confirmRemoveAssignment(account: GateStaffAccount, assignment: { id: string; name: string }): void {
    this.activeRemoveAssignment.set({ account, assignment });
  }

  closeRemoveAssignmentModal(): void {
    this.activeRemoveAssignment.set(null);
  }

  removeAssignment(account: GateStaffAccount, eventId: string): void {
    this.processingId.set(account.id);
    this.gateStaffService.removeFromEvent(account.id, eventId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.closeRemoveAssignmentModal();
        this.toast.success(
          this.translation.t('gateStaff.removedAssignmentSuccess', { username: account.username }) || 'Assignment removed successfully'
        );
        this.loadStaff();
      },
      error: (err) => {
        this.processingId.set(null);
        this.closeRemoveAssignmentModal();
        const description = describeHttpError(err, 'gateStaffAction');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  deletePermanently(account: GateStaffAccount): void {
    this.pendingDeleteAccount.set(account);
    this.showDeleteConfirmation.set(true);
  }

  closeDeleteConfirmation(): void {
    this.showDeleteConfirmation.set(false);
    this.pendingDeleteAccount.set(null);
  }

  confirmDeletePermanently(): void {
    const account = this.pendingDeleteAccount();
    if (!account) return;

    this.showDeleteConfirmation.set(false);
    this.pendingDeleteAccount.set(null);

    this.processingId.set(account.id);
    this.gateStaffService.deletePermanently(account.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(
          this.translation.t('gateStaff.deletedPermanentlyToast', { username: account.username }) || 'Staff deleted permanently'
        );
        this.loadStaff();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'gateStaffAction');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }
}
