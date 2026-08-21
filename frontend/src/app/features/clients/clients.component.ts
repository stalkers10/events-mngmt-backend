import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClientService, ClientRecord } from '../../core/services/client.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { describeHttpError } from '../../core/utils/http-error.util';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { CustomSelectComponent, SelectOption } from '../../shared/components/custom-select/custom-select.component';
import { SubscriptionSummary, SubscriptionUsage, SubscriptionPlanCode } from '../../core/models/subscription.model';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, I18nextPipe, ConfirmationDialogComponent, CustomSelectComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent implements OnInit {
  clients = signal<ClientRecord[]>([]);
  searchQuery = signal('');

  filteredClients = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.clients();

    return this.clients().filter((client) =>
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query)
    );
  });

  isLoading = signal(true);
  isSubmitting = signal(false);
  showPassword = signal(false);
  submitted = signal(false);
  processingId = signal<string | null>(null);

  showFormModal = signal(false);
  editingClient = signal<ClientRecord | null>(null);
  form;

  showDeactivateConfirmation = signal(false);
  pendingDeactivateClient = signal<ClientRecord | null>(null);

  showDeleteConfirmation = signal(false);
  pendingDeleteClient = signal<ClientRecord | null>(null);

  // ---- Subscription management (Super Admin) ----
  showSubscriptionModal = signal(false);
  selectedSubClient = signal<ClientRecord | null>(null);
  subLoading = signal(false);
  subSummary = signal<SubscriptionSummary | null>(null);
  subUsage = signal<SubscriptionUsage | null>(null);
  payments = signal<any[]>([]);
  planOptions = signal<SelectOption[]>([]);
  grantPlanCode = signal<SubscriptionPlanCode>('GO');
  grantMonths = signal(1);
  isGranting = signal(false);

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private subscriptionService: SubscriptionService,
    private toast: ToastService,
    public translation: I18nextService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.minLength(3), Validators.maxLength(50)]],
      password: ['', [Validators.minLength(8)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['']
    });
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  openCreateModal(): void {
    this.editingClient.set(null);
    this.form.reset();
    this.submitted.set(false);
    this.showPassword.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(client: ClientRecord): void {
    this.editingClient.set(client);
    this.form.patchValue({
      // username/password are only used when creating
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      password: ''
    });
    this.submitted.set(false);
    this.showPassword.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.editingClient.set(null);
    this.form.reset();
    this.submitted.set(false);
  }

  submitForm(): void {
    if (this.form.invalid) return;

    this.submitted.set(true);
    this.isSubmitting.set(true);
    const { username, password, name, email, phone } = this.form.getRawValue();
    const editing = this.editingClient();

    if (editing) {
      this.clientService.updateClient(editing.id, name!, email!, phone || undefined, password || undefined).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success(this.translation.t('clients.updatedToast', { name: name! }) || 'Client updated successfully');
          this.closeFormModal();
          this.loadClients();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const description = describeHttpError(err, 'generic');
          this.toast.error(this.translation.t(description.key, description.params));
        },
      });
    } else {
      // creation: require username and password
      if (!username || username.trim().length < 3) {
        this.isSubmitting.set(false);
        this.toast.error(this.translation.t('clients.usernameRequired') || 'Username is required');
        return;
      }
      if (!password || password.length < 8) {
        this.isSubmitting.set(false);
        this.toast.error(this.translation.t('clients.passwordRequired') || 'Password must be at least 8 characters');
        return;
      }

      this.clientService.createClient(username!, password!, name!, email!, phone || undefined).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success(this.translation.t('clients.createdToast', { name: name! }) || 'Client created successfully');
          this.closeFormModal();
          this.loadClients();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const description = describeHttpError(err, 'clientCreate');
          this.toast.error(this.translation.t(description.key, description.params));
        },
      });
    }
  }

  deactivate(client: ClientRecord): void {
    this.pendingDeactivateClient.set(client);
    this.showDeactivateConfirmation.set(true);
  }

  closeDeactivateConfirmation(): void {
    this.showDeactivateConfirmation.set(false);
    this.pendingDeactivateClient.set(null);
  }

  confirmDeactivate(): void {
    const client = this.pendingDeactivateClient();
    if (!client) return;

    this.showDeactivateConfirmation.set(false);
    this.pendingDeactivateClient.set(null);

    this.processingId.set(client.id);
    this.clientService.deactivateClient(client.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(this.translation.t('clients.deactivatedToast', { name: client.name }) || 'Client deactivated');
        this.loadClients();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  reactivate(client: ClientRecord): void {
    this.processingId.set(client.id);
    this.clientService.reactivateClient(client.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(this.translation.t('clients.reactivatedToast', { name: client.name }) || 'Client reactivated');
        this.loadClients();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  deletePermanently(client: ClientRecord): void {
    this.pendingDeleteClient.set(client);
    this.showDeleteConfirmation.set(true);
  }

  closeDeleteConfirmation(): void {
    this.showDeleteConfirmation.set(false);
    this.pendingDeleteClient.set(null);
  }

  confirmDeletePermanently(): void {
    const client = this.pendingDeleteClient();
    if (!client) return;

    this.showDeleteConfirmation.set(false);
    this.pendingDeleteClient.set(null);

    this.processingId.set(client.id);
    this.clientService.deleteClient(client.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(this.translation.t('clients.deletedToast', { name: client.name }) || 'Client deleted permanently');
        this.loadClients();
      },
      error: (err) => {
        this.processingId.set(null);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  // ---- Subscription management (Super Admin) ----
  planLabel(code?: string): string {
    switch (code) {
      case 'GO': return this.translation.t('clients.planGo') || 'Go';
      case 'PRO': return this.translation.t('clients.planPro') || 'Pro';
      default: return this.translation.t('clients.planFree') || 'Free';
    }
  }

  statusLabel(status?: string): string {
    return this.translation.t('clients.status' + (status || 'FREE')) || status || 'Free';
  }

  paymentStatusLabel(status?: string) {
    return this.translation.t('clients.pay' + (status || 'PENDING')) || status || status;
  }

  planBadgeClass(code?: string): string {
    return 'plan-badge plan-' + (code || 'FREE').toLowerCase();
  }

  paymentStatusClass(status?: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'FAILED') return 'pay-badge pay-failed';
    if (s === 'PENDING') return 'pay-badge pay-pending';
    if (s === 'SUCCESSFUL') return 'pay-badge pay-successful';
    return 'pay-badge';
  }

  openSubscriptionModal(client: ClientRecord): void {
    this.selectedSubClient.set(client);
    this.showSubscriptionModal.set(true);
    this.loadSubscriptionData(client);
  }

  closeSubscriptionModal(): void {
    this.showSubscriptionModal.set(false);
    this.selectedSubClient.set(null);
    this.subSummary.set(null);
    this.subUsage.set(null);
    this.payments.set([]);
  }

  loadSubscriptionData(client: ClientRecord): void {
    this.subLoading.set(true);
    forkJoin({
      summary: this.subscriptionService.adminSubscription(client.id),
      usage: this.subscriptionService.adminUsage(client.id),
      payments: this.subscriptionService.adminPayments(client.id),
      plans: this.subscriptionService.plans(),
    }).subscribe({
      next: ({ summary, usage, payments, plans }) => {
        this.subSummary.set(summary);
        this.subUsage.set(usage);
        this.payments.set(payments);
        this.planOptions.set(plans.map((p) => ({ value: p.code, label: p.name })));
        this.grantPlanCode.set(summary.plan.code);
        this.subLoading.set(false);
      },
      error: (err) => {
        this.subLoading.set(false);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  grantSubscription(): void {
    const client = this.selectedSubClient();
    if (!client) return;
    this.isGranting.set(true);
    const code = this.grantPlanCode();
    this.subscriptionService.adminGrant(client.id, code, code === 'FREE' ? undefined : this.grantMonths())
      .subscribe({
        next: () => {
          this.isGranting.set(false);
          this.toast.success(this.translation.t('clients.subscriptionUpdatedToast', { name: client.name }) || 'Subscription updated');
          this.loadSubscriptionData(client);
          this.loadClients();
        },
        error: (err) => {
          this.isGranting.set(false);
          const description = describeHttpError(err, 'generic');
          this.toast.error(this.translation.t(description.key, description.params));
        },
      });
  }

  adminCancel(): void {
    const client = this.selectedSubClient();
    if (!client) return;
    this.subscriptionService.adminCancel(client.id).subscribe({
      next: () => {
        this.toast.success(this.translation.t('clients.subscriptionUpdatedToast', { name: client.name }) || 'Subscription updated');
        this.loadSubscriptionData(client);
        this.loadClients();
      },
      error: (err) => {
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  adminResume(): void {
    const client = this.selectedSubClient();
    if (!client) return;
    this.subscriptionService.adminResume(client.id).subscribe({
      next: () => {
        this.toast.success(this.translation.t('clients.subscriptionUpdatedToast', { name: client.name }) || 'Subscription updated');
        this.loadSubscriptionData(client);
        this.loadClients();
      },
      error: (err) => {
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }
}
