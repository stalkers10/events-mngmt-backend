import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Building, Room, EventSummary } from '../../core/models/dashboard.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { I18nextService } from '../../core/services/i18next.service';
import { ToastService } from '../../core/services/toast.service';
import { VenueService } from '../../core/services/venue.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nextPipe],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss',
})
export class EventsComponent implements OnInit {
  readonly rooms = signal<Room[]>([]);
  readonly buildings = signal<Building[]>([]);
  readonly events = signal<EventSummary[]>([]);
  readonly isLoading = signal(true);

  constructor(
    private venues: VenueService,
    private dashboard: DashboardService,
    private toast: ToastService,
    private i18n: I18nextService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      rooms: this.venues.rooms(),
      buildings: this.venues.buildings(),
      events: this.dashboard.events()
    }).subscribe({
      next: ({ rooms, buildings, events }) => {
        this.rooms.set(rooms);
        this.buildings.set(buildings);
        // Sort events chronologically
        this.events.set([...events].sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time)));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  roomLabel(room: Room): string {
    const building = this.buildings().find((item) => item.id === room.building_id);
    return `${room.room_number} · ${this.i18n.t('events.floor')} ${room.floor_number}${building ? ` · ${building.name}` : ''}`;
  }

  roomFor(event: EventSummary): Room | undefined {
    return this.rooms().find((room) => room.id === event.room_id);
  }

  eventState(event: EventSummary): 'live' | 'upcoming' | 'past' {
    const now = Date.now();
    const start = +new Date(event.start_time);
    const end = +new Date(event.end_time);
    if (end < now) return 'past';
    if (start <= now && end >= now) return 'live';
    return 'upcoming';
  }
}
