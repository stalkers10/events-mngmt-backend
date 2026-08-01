import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventSummary, Room, Building } from '../../core/models/dashboard.model';
import { DashboardService } from '../../core/services/dashboard.service';
import {VenueService} from "../../core/services/venue.service";
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { getEventState, isEventVisible } from '../../core/utils/event-status';

type RoomStatus = 'available' | 'active' | 'reserved';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, I18nextPipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly rooms = signal<Room[]>([]);
  readonly events = signal<EventSummary[]>([]);
  readonly buildings = signal<Building[]>([]);
  readonly isLoading = signal(true);
  readonly showCreateBuildingModal = signal(false);
  readonly isCreatingBuilding = signal(false);
  newBuildingName = '';
  newBuildingAddress = '';

  constructor(
    private dashboard: DashboardService,
    private venueService: VenueService,
    private toast: ToastService,
    private router: Router,
    public translation: I18nextService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    forkJoin({ rooms: this.dashboard.rooms(), events: this.dashboard.events(), buildings: this.dashboard.buildings() }).subscribe({
      next: ({ rooms, events, buildings }) => {
        this.rooms.set(rooms);
        this.events.set([...events].sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time)));
        this.buildings.set(buildings);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.translation.t('errors.loadFailed'));
      },
    });
  }

  openCreateBuildingModal(): void {
    this.newBuildingName = '';
    this.newBuildingAddress = '';
    this.isCreatingBuilding.set(false);
    this.showCreateBuildingModal.set(true);
  }

  closeCreateBuildingModal(): void {
    this.showCreateBuildingModal.set(false);
    this.newBuildingName = '';
    this.newBuildingAddress = '';
    this.isCreatingBuilding.set(false);
  }

  createBuilding(): void {
    if (!this.newBuildingName.trim()) {
      this.toast.error(this.translation.t('errors.fillAllFields'));
      return;
    }

    this.isCreatingBuilding.set(true);
    this.venueService.createBuilding({
      name: this.newBuildingName.trim(),
      address: this.newBuildingAddress.trim() || undefined,
    }).subscribe({
      next: (building) => {
        this.buildings.update((current) => [building, ...current]);
        this.toast.success(this.translation.t('dashboard.buildingCreated'));
        this.closeCreateBuildingModal();
      },
      error: () => {
        this.isCreatingBuilding.set(false);
        this.toast.error(this.translation.t('errors.createFailed'));
      },
    });
  }


  goToRoom(roomId: string): void {
    this.router.navigate(['/venues'], { queryParams: { highlight: roomId } });
  }

  roomEvent(roomId: string): EventSummary | undefined {
    return this.events().find((event) =>
      event.room_id === roomId && isEventVisible(event.start_time, event.end_time) && getEventState(event.start_time, event.end_time) === 'live'
    );
  }

  nextRoomEvent(roomId: string): EventSummary | undefined {
    return this.events().find((event) =>
      event.room_id === roomId && isEventVisible(event.start_time, event.end_time) && getEventState(event.start_time, event.end_time) === 'upcoming'
    );
  }

  roomStatus(room: Room): RoomStatus {
    if (this.roomEvent(room.id)) return 'active';
    if (this.nextRoomEvent(room.id)) return 'reserved';
    return 'available';
  }

  displayedRooms(): Room[] {
    return [...this.rooms()].reverse().slice(0, 4);
  }

  displayedEvents(): EventSummary[] {
    return this.events()
      .filter((event) => isEventVisible(event.start_time, event.end_time) && getEventState(event.start_time, event.end_time) === 'live')
      .slice(0, 4);
  }

  roomFor(event: EventSummary): Room | undefined {
    return this.rooms().find((room) => room.id === event.room_id);
  }

  eventState(event: EventSummary): 'live' | 'upcoming' | 'past' {
    return getEventState(event.start_time, event.end_time);
  }

  buildingFor(event: EventSummary): Building | undefined {
    return this.buildings().find((building) => building.id === event.room_id);
  }
}
