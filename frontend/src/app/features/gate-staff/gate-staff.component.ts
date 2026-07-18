import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GateStaffService } from '../../core/services/gate-staff.service';
import { GateStaffAccount } from '../../core/models/gate-staff.model';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { describeHttpError } from '../../core/utils/http-error.util';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';

@Component({
  selector: 'app-gate-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, I18nextPipe],
  templateUrl: './gate-staff.component.html',
  styleUrl: './gate-staff.component.scss',
})
export class GateStaffComponent implements OnInit {
  form;

  staff = signal<GateStaffAccount[]>([]);
  isLoadingList = signal(true);
  isSubmitting = signal(false);
  processingId = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private gateStaffService: GateStaffService,
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
    const confirmMessage = this.translation.t('gateStaff.confirmDeactivate', {
      username: account.username,
    });
    if (!confirm(confirmMessage)) {
      return;
    }

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
}
