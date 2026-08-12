import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ClientService, ClientRecord } from '../../core/services/client.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { describeHttpError } from '../../core/utils/http-error.util';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, I18nextPipe, ConfirmationDialogComponent],
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
  processingId = signal<string | null>(null);

  showFormModal = signal(false);
  editingClient = signal<ClientRecord | null>(null);
  form;

  showDeactivateConfirmation = signal(false);
  pendingDeactivateClient = signal<ClientRecord | null>(null);

  showDeleteConfirmation = signal(false);
  pendingDeleteClient = signal<ClientRecord | null>(null);

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
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
    this.showFormModal.set(true);
  }

  openEditModal(client: ClientRecord): void {
    this.editingClient.set(client);
    this.form.patchValue({
      // username/password are only used when creating
      name: client.name,
      email: client.email,
      phone: client.phone || ''
    });
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.editingClient.set(null);
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const { username, password, name, email, phone } = this.form.getRawValue();
    const editing = this.editingClient();

    if (editing) {
      this.clientService.updateClient(editing.id, name!, email!, phone || undefined).subscribe({
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
}
