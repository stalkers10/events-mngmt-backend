import { Component, OnInit, signal, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Building, Room } from '../../core/models/dashboard.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { VenueService } from '../../core/services/venue.service';
import { I18nextService } from '../../core/services/i18next.service';
import { ToastService } from '../../core/services/toast.service';
import { describeHttpError } from '../../core/utils/http-error.util';
import { planLimitFromError } from '../../core/utils/plan-limit.util';
import { UpgradeService } from '../../core/services/upgrade.service';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { ClientFilterService } from '../../core/services/client-filter.service';

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, I18nextPipe, FormsModule, ConfirmationDialogComponent],
  templateUrl: './venues.component.html',
  styleUrl: './venues.component.scss',
})
export class VenuesComponent implements OnInit, AfterViewInit {
  readonly buildings = signal<Building[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly isLoading = signal(true);
  readonly isCreatingBuilding = signal(false);
  readonly isSubmitting = signal(false);
  readonly showBuildingForm = signal(false);
  readonly showCreateModal = signal(false);
  readonly activeRoomsBuilding = signal<Building | null>(null);
  readonly searchQuery = signal('');
  readonly showDeleteBuildingConfirmation = signal(false);
  readonly showDeleteRoomConfirmation = signal(false);
  readonly pendingDeleteBuildingId = signal<string | null>(null);
  readonly pendingDeleteRoomId = signal<string | null>(null);

  readonly filteredBuildings = computed(() => {
    let list = this.clientFilter.filterList(this.buildings());
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;

    return list.filter((building) => {
      const matchesBuilding =
        building.name.toLowerCase().includes(query) ||
        (building.address?.toLowerCase().includes(query) ?? false);
      if (matchesBuilding) return true;

      return this.rooms().some((room) =>
        room.building_id === building.id &&
        (room.room_number.toLowerCase().includes(query) ||
          String(room.floor_number).includes(query) ||
          String(room.capacity ?? '').includes(query))
      );
    });
  });

  openRoomsPopup(building: Building): void {
    this.activeRoomsBuilding.set(building);
  }

  closeRoomsPopup(): void {
    this.activeRoomsBuilding.set(null);
  }

  /** Room ID to highlight after data loads (from query param) */
  private highlightRoomId: string | null = null;

  buildingForm;
  roomForm;

  constructor(
    private fb: FormBuilder,
    private venues: VenueService,
    private toast: ToastService,
    public i18n: I18nextService,
    private route: ActivatedRoute,
    public clientFilter: ClientFilterService,
    private upgrade: UpgradeService
  ) {
    this.buildingForm = this.fb.group({
      name: ['', Validators.required],
      address: [''],
    });
    this.roomForm = this.fb.group({
      buildingId: ['', Validators.required],
      roomNumber: ['', Validators.required],
      floorNumber: [1, [Validators.required, Validators.pattern(/^-?\d+$/)]],
      capacity: [null as number | null, [Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.highlightRoomId = this.route.snapshot.queryParamMap.get('highlight');
    this.loadBuildings();
  }

  ngAfterViewInit(): void {
    // Scroll + blink happens after data loads, triggered inside loadBuildings
  }

  private scrollAndHighlight(roomId: string): void {
    setTimeout(() => {
      const el = document.getElementById(`room-${roomId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('room-highlight');
      setTimeout(() => el.classList.remove('room-highlight'), 2400);
    }, 100);
  }

  loadBuildings(): void {
    this.isLoading.set(true);
    forkJoin({ buildings: this.venues.buildings(), rooms: this.venues.rooms() }).subscribe({
      next: ({ buildings, rooms }) => {
        this.buildings.set(buildings);
        this.rooms.set(rooms);
        this.isLoading.set(false);
        if (this.highlightRoomId) {
          this.scrollAndHighlight(this.highlightRoomId);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  createBuilding(): void {
    if (this.buildingForm.invalid) return;
    this.isCreatingBuilding.set(true);
    const { name, address } = this.buildingForm.getRawValue();
    this.venues.createBuilding({ name: name!, address: address || undefined }).subscribe({
      next: (building) => {
        this.buildings.update((buildings) => [building, ...buildings]);
        this.roomForm.controls.buildingId.setValue(building.id);
        this.buildingForm.reset();
        this.showBuildingForm.set(false);
        this.isCreatingBuilding.set(false);
        this.toast.success(this.i18n.t('venues.buildingCreated'));
      },
      error: (error) => {
        this.isCreatingBuilding.set(false);
        const limit = planLimitFromError(error);
        if (limit) {
          this.toast.warning(limit.reason);
          setTimeout(() => this.upgrade.show(limit), 350);
          return;
        }
        const description = describeHttpError(error, 'generic');
        this.toast.error(this.i18n.t(description.key, description.params));
      },
    });
  }

  createRoom(): void {
    if (this.roomForm.invalid) return;
    this.isSubmitting.set(true);
    const { buildingId, roomNumber, floorNumber, capacity } = this.roomForm.getRawValue();
    this.venues
      .createRoom({
        buildingId: buildingId!,
        roomNumber: roomNumber!,
        floorNumber: Number(floorNumber),
        capacity: capacity ?? undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.roomForm.patchValue({ roomNumber: '', capacity: null, floorNumber: 1 });
          this.toast.success(this.i18n.t('venues.roomCreated'));
          this.closeCreate();
          this.loadBuildings();
        },
        error: (error) => {
          this.isSubmitting.set(false);
          const description = describeHttpError(error, 'generic');
          this.toast.error(this.i18n.t(description.key, description.params));
        },
      });
  }

  roomsForBuilding(buildingId: string): Room[] {
    return this.rooms().filter((room) => room.building_id === buildingId);
  }

  closeCreate(): void {
    this.showCreateModal.set(false);
    this.roomForm.patchValue({ buildingId: '' });
  }

  openCreateModal(buildingId?: string): void {
    if (buildingId) {
      this.roomForm.patchValue({ buildingId });
    }
    this.showCreateModal.set(true);
  }

  deleteBuilding(buildingId: string): void {
    this.pendingDeleteBuildingId.set(buildingId);
    this.showDeleteBuildingConfirmation.set(true);
  }

  deleteRoom(roomId: string): void {
    this.pendingDeleteRoomId.set(roomId);
    this.showDeleteRoomConfirmation.set(true);
  }

  closeDeleteBuildingConfirmation(): void {
    this.showDeleteBuildingConfirmation.set(false);
    this.pendingDeleteBuildingId.set(null);
  }

  closeDeleteRoomConfirmation(): void {
    this.showDeleteRoomConfirmation.set(false);
    this.pendingDeleteRoomId.set(null);
  }

  confirmDeleteBuilding(): void {
    const buildingId = this.pendingDeleteBuildingId();
    if (!buildingId) return;

    this.showDeleteBuildingConfirmation.set(false);
    this.pendingDeleteBuildingId.set(null);

    this.venues.deleteBuilding(buildingId).subscribe({
      next: () => {
        this.buildings.update((buildings) => buildings.filter((b) => b.id !== buildingId));
        this.rooms.update((rooms) => rooms.filter((r) => r.building_id !== buildingId));
        this.toast.success(this.i18n.t('venues.buildingDeleted'));
      },
      error: (error) => {
        const description = describeHttpError(error, 'generic');
        this.toast.error(this.i18n.t(description.key, description.params));
      },
    });
  }

  confirmDeleteRoom(): void {
    const roomId = this.pendingDeleteRoomId();
    if (!roomId) return;

    this.showDeleteRoomConfirmation.set(false);
    this.pendingDeleteRoomId.set(null);

    this.venues.deleteRoom(roomId).subscribe({
      next: () => {
        this.rooms.update((rooms) => rooms.filter((r) => r.id !== roomId));
        this.toast.success(this.i18n.t('venues.roomDeleted'));
      },
      error: (error) => {
        const description = describeHttpError(error, 'generic');
        this.toast.error(this.i18n.t(description.key, description.params));
      },
    });
  }
}
