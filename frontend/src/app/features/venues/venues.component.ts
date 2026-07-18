import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { Building, Room } from '../../core/models/dashboard.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { VenueService } from '../../core/services/venue.service';
import { I18nextService } from '../../core/services/i18next.service';
import { ToastService } from '../../core/services/toast.service';
import { describeHttpError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, I18nextPipe],
  templateUrl: './venues.component.html',
  styleUrl: './venues.component.scss',
})
export class VenuesComponent implements OnInit {
  readonly buildings = signal<Building[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly isLoading = signal(true);
  readonly isCreatingBuilding = signal(false);
  readonly isSubmitting = signal(false);
  readonly showBuildingForm = signal(false);
  readonly showCreateModal = signal(false);

  buildingForm;
  roomForm;

  constructor(
    private fb: FormBuilder,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService
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
    this.loadBuildings();
  }

  loadBuildings(): void {
    this.isLoading.set(true);
    forkJoin({ buildings: this.venues.buildings(), rooms: this.venues.rooms() }).subscribe({
      next: ({ buildings, rooms }) => {
        this.buildings.set(buildings);
        this.rooms.set(rooms);
        this.isLoading.set(false);
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
  }
}
