import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Building, Room, EventSummary } from '../../core/models/dashboard.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { I18nextService } from '../../core/services/i18next.service';
import { ToastService } from '../../core/services/toast.service';
import { VenueService } from '../../core/services/venue.service';
import { DashboardService } from '../../core/services/dashboard.service';

export type FilterTab = 'all' | 'upcoming' | 'live' | 'past';
export type SortOrder = 'latest' | 'oldest';

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

  readonly filterTabs: FilterTab[] = ['all', 'upcoming', 'live', 'past'];
  readonly activeFilter = signal<FilterTab>('all');
  readonly sortOrder = signal<SortOrder>('latest');

  readonly filteredEvents = computed(() => {
    const filter = this.activeFilter();
    const sort = this.sortOrder();
    let list = this.events().filter(e =>
      filter === 'all' ? true : this.eventState(e) === filter
    );
    return [...list].sort((a, b) => {
      const diff = +new Date(a.start_time) - +new Date(b.start_time);
      return sort === 'latest' ? -diff : diff;
    });
  });

  readonly activeEventsCount = computed(() =>
    this.events().filter(e => {
      const s = this.eventState(e);
      return s === 'live' || s === 'upcoming';
    }).length
  );

  readonly totalCapacity = computed(() =>
    this.events().reduce((sum, e) => {
      const room = this.roomFor(e);
      return sum + (room?.capacity ?? 0);
    }, 0)
  );

  constructor(
    private venueService: VenueService,
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
      rooms: this.venueService.rooms(),
      buildings: this.venueService.buildings(),
      events: this.dashboard.events()
    }).subscribe({
      next: ({ rooms, buildings, events }) => {
        this.rooms.set(rooms);
        this.buildings.set(buildings);
        this.events.set(events);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  roomFor(event: EventSummary): Room | undefined {
    return this.rooms().find(r => r.id === event.room_id);
  }

  roomFloorLabel(event: EventSummary): string {
    const room = this.roomFor(event);
    if (!room) return '—';
    return `${room.room_number} · Floor ${room.floor_number}`;
  }

  eventState(event: EventSummary): 'live' | 'upcoming' | 'past' {
    const now = Date.now();
    const start = +new Date(event.start_time);
    const end = +new Date(event.end_time);
    if (end < now) return 'past';
    if (start <= now && end >= now) return 'live';
    return 'upcoming';
  }

  setFilter(filter: FilterTab): void {
    this.activeFilter.set(filter);
  }

  setSortOrder(order: SortOrder): void {
    this.sortOrder.set(order);
  }

  countByFilter(filter: FilterTab): number {
    if (filter === 'all') return this.events().length;
    return this.events().filter(e => this.eventState(e) === filter).length;
  }

  deleteEvent(id: string): void {
    if (confirm(this.i18n.t('events.confirmDelete') || 'Are you sure you want to delete this event?')) {
      this.venueService.deleteEvent(id).subscribe({
        next: () => {
          this.toast.success(this.i18n.t('events.deleteSuccess') || 'Event deleted successfully');
          this.loadData();
        },
        error: () => this.toast.error(this.i18n.t('errors.deleteFailed') || 'Failed to delete event')
      });
    }
  }
}
