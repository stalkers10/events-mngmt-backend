import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Building, Room, EventSummary } from '../../core/models/dashboard.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { I18nextService } from '../../core/services/i18next.service';
import { ToastService } from '../../core/services/toast.service';
import { VenueService } from '../../core/services/venue.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { getEventState, isEventVisible, isEventFinished, EventState } from '../../core/utils/event-status';
import { ClientFilterService } from '../../core/services/client-filter.service';
import { CustomSelectComponent, SelectOption } from '../../shared/components/custom-select/custom-select.component';

export type FilterTab = 'all' | 'drafts' | 'upcoming' | 'live' | 'past';
export type SortOrder = 'latest' | 'oldest';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nextPipe, FormsModule, ConfirmationDialogComponent, CustomSelectComponent],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss',
})
export class EventsComponent implements OnInit {
  readonly rooms = signal<Room[]>([]);
  readonly buildings = signal<Building[]>([]);
  readonly events = signal<EventSummary[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');

  readonly filterTabs: FilterTab[] = ['all', 'drafts', 'upcoming', 'live', 'past'];
  readonly activeFilter = signal<FilterTab>('all');
  readonly sortOrder = signal<SortOrder>('latest');

  readonly sortOptions = computed<SelectOption[]>(() => [
    { value: 'latest', label: this.i18n.t('events.sortLatest') },
    { value: 'oldest', label: this.i18n.t('events.sortOldest') },
  ]);

  readonly filteredEvents = computed(() => {
    const filter = this.activeFilter();
    const sort = this.sortOrder();
    const query = this.searchQuery().trim().toLowerCase();

    let list = this.clientFilter.filterList(this.events());

    // Apply filter tab
    if (filter === 'drafts') {
      list = list.filter(e => this.eventState(e) === 'draft');
    } else if (filter === 'all') {
      // All includes drafts + non-expired published events
      list = list.filter(e => this.eventState(e) === 'draft' || isEventVisible(e.start_time, e.end_time));
    } else {
      // upcoming / live / past — published events only
      list = list.filter(e =>
        this.eventState(e) !== 'draft' &&
        isEventVisible(e.start_time, e.end_time) &&
        this.eventState(e) === filter
      );
    }

    if (query) {
      list = list.filter((event) => {
        const room = this.roomFor(event);
        const building = this.buildingFor(room);
        return (
          event.name.toLowerCase().includes(query) ||
          room?.room_number.toLowerCase().includes(query) ||
          String(room?.floor_number ?? '').includes(query) ||
          building?.name.toLowerCase().includes(query) ||
          (building?.address?.toLowerCase().includes(query) ?? false)
        );
      });
    }

    return [...list].sort((a, b) => {
      // Drafts always first in 'all' tab, then sort by start_time
      const aIsDraft = this.eventState(a) === 'draft';
      const bIsDraft = this.eventState(b) === 'draft';
      if (aIsDraft && !bIsDraft) return -1;
      if (!aIsDraft && bIsDraft) return 1;
      if (aIsDraft && bIsDraft) {
        // Sort drafts by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const diff = +new Date(a.start_time!) - +new Date(b.start_time!);
      return sort === 'latest' ? -diff : diff;
    });
  });

  readonly activeEventsCount = computed(() =>
    this.clientFilter.filterList(this.events()).filter(e =>
      isEventVisible(e.start_time, e.end_time) &&
      (this.eventState(e) === 'live' || this.eventState(e) === 'upcoming')
    ).length
  );

  readonly draftsCount = computed(() =>
    this.clientFilter.filterList(this.events()).filter(e => this.eventState(e) === 'draft').length
  );

  readonly totalCapacity = computed(() =>
    this.clientFilter.filterList(this.events()).reduce((sum, e) => {
      const room = this.roomFor(e);
      return sum + (room?.capacity ?? 0);
    }, 0)
  );

  readonly showDeleteConfirmation = signal(false);
  readonly pendingDeleteEventId = signal<string | null>(null);

  constructor(
    private venueService: VenueService,
    private dashboard: DashboardService,
    private toast: ToastService,
    public i18n: I18nextService,
    private router: Router,
    public clientFilter: ClientFilterService
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
    const roomIds = event.room_ids && event.room_ids.length > 0
      ? event.room_ids
      : event.room_id ? [event.room_id] : [];
    return this.rooms().find((r) => roomIds.includes(r.id));
  }

  buildingFor(room: Room | undefined): Building | undefined {
    return room ? this.buildings().find((b) => b.id === room.building_id) : undefined;
  }

  roomFloorLabel(event: EventSummary): string {
    if (this.eventState(event) === 'draft') return '—';
    const roomIds = event.room_ids && event.room_ids.length > 0
      ? event.room_ids
      : event.room_id ? [event.room_id] : [];
    const rooms = this.rooms().filter((room) => roomIds.includes(room.id));
    if (rooms.length === 0) return '—';
    if (rooms.length === 1) return `${rooms[0].room_number} · Floor ${rooms[0].floor_number}`;
    return `${rooms.length} rooms selected`;
  }

  eventState(event: EventSummary): EventState {
    return getEventState(event.start_time, event.end_time, event.status);
  }

  isDraft(event: EventSummary): boolean {
    return this.eventState(event) === 'draft';
  }

  canEditSeating(event: EventSummary): boolean {
    return !this.isDraft(event) && !isEventFinished(event.end_time);
  }

  openSeatingMap(eventId: string): void {
    this.router.navigate(['/events', eventId, 'seating-map']);
  }

  openEditPage(eventId: string): void {
    this.router.navigate(['/events', eventId, 'edit']);
  }

  setFilter(filter: FilterTab): void {
    this.activeFilter.set(filter);
  }

  setSortOrder(order: SortOrder): void {
    this.sortOrder.set(order);
  }

  countByFilter(filter: FilterTab): number {
    const list = this.clientFilter.filterList(this.events());
    if (filter === 'drafts') {
      return list.filter(e => this.eventState(e) === 'draft').length;
    }
    if (filter === 'all') {
      return list.filter(e =>
        this.eventState(e) === 'draft' || isEventVisible(e.start_time, e.end_time)
      ).length;
    }
    return list.filter(e =>
      this.eventState(e) !== 'draft' &&
      isEventVisible(e.start_time, e.end_time) &&
      this.eventState(e) === filter
    ).length;
  }

  deleteEvent(id: string): void {
    this.pendingDeleteEventId.set(id);
    this.showDeleteConfirmation.set(true);
  }

  closeDeleteEventConfirmation(): void {
    this.showDeleteConfirmation.set(false);
    this.pendingDeleteEventId.set(null);
  }

  confirmDeleteEvent(): void {
    const eventId = this.pendingDeleteEventId();
    if (!eventId) return;
    this.showDeleteConfirmation.set(false);
    this.pendingDeleteEventId.set(null);
    this.venueService.deleteEvent(eventId).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('events.deleteSuccess'));
        this.loadData();
      },
      error: () => this.toast.error(this.i18n.t('events.deleteFailed')),
    });
  }
}
