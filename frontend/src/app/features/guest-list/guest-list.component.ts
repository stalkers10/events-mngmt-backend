import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { I18nextService } from '../../core/services/i18next.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { RoleType } from '../../core/models/auth.model';
import { VenueService, EventOccupancy, OccupancyTable, OccupancyChair } from '../../core/services/venue.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { EventSummary, Room } from '../../core/models/dashboard.model';

export interface GuestRow {
  guestName: string;
  guestEmail: string | null;
  ticketId: string | null;
  ticketStatus: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | null;
  reservationId: string;
  tableNumber: string;
  chairNumber: string;
}

@Component({
  selector: 'app-guest-list',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nextPipe],
  templateUrl: './guest-list.component.html',
  styleUrl: './guest-list.component.scss',
})
export class GuestListComponent implements OnInit {
  // State: null = picking event, non-null = viewing guests for that event
  readonly selectedEvent = signal<EventSummary | null>(null);
  readonly events = signal<EventSummary[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly occupancy = signal<EventOccupancy | null>(null);
  readonly isLoadingEvents = signal(true);
  readonly isLoadingGuests = signal(false);

  // Search / filter
  searchQuery = '';

  readonly guests = computed<GuestRow[]>(() => {
    const occ = this.occupancy();
    if (!occ) return [];
    const rows: GuestRow[] = [];
    for (const table of occ.tables) {
      for (const chair of table.chairs) {
        if (chair.reservation_id && chair.invitee_name) {
          rows.push({
            guestName: chair.invitee_name,
            guestEmail: chair.invitee_email,
            ticketId: chair.ticket_id,
            ticketStatus: chair.ticket_status,
            reservationId: chair.reservation_id,
            tableNumber: table.table_number,
            chairNumber: chair.chair_number,
          });
        }
      }
    }
    return rows;
  });

  readonly filteredGuests = computed<GuestRow[]>(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.guests();
    return this.guests().filter(
      (g) =>
        g.guestName.toLowerCase().includes(q) ||
        g.guestEmail?.toLowerCase().includes(q) ||
        g.tableNumber.includes(q)
    );
  });

  readonly totalSeats = computed(() =>
    this.occupancy()?.tables.reduce((n, t) => n + t.chairs.length, 0) ?? 0
  );

  readonly reservedSeats = computed(() => this.guests().length);

  readonly isAdmin = computed(() => this.auth.hasRole(RoleType.ADMIN));

  constructor(
    private venues: VenueService,
    private dashboard: DashboardService,
    private toast: ToastService,
    private i18n: I18nextService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoadingEvents.set(true);
    forkJoin({
      events: this.dashboard.events(),
      rooms: this.venues.rooms(),
    }).subscribe({
      next: ({ events, rooms }) => {
        this.events.set([...events].sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time)));
        this.rooms.set(rooms);
        this.isLoadingEvents.set(false);
      },
      error: () => {
        this.isLoadingEvents.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  selectEvent(event: EventSummary): void {
    this.selectedEvent.set(event);
    this.searchQuery = '';
    this.loadGuests(event.id);
  }

  loadGuests(eventId: string): void {
    this.isLoadingGuests.set(true);
    this.venues.occupancy(eventId).subscribe({
      next: (occ) => {
        this.occupancy.set(occ);
        this.isLoadingGuests.set(false);
      },
      error: () => {
        this.isLoadingGuests.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  goBack(): void {
    this.selectedEvent.set(null);
    this.occupancy.set(null);
  }

  roomFor(event: EventSummary): Room | undefined {
    return this.rooms().find((r) => r.id === event.room_id);
  }

  eventState(event: EventSummary): 'live' | 'upcoming' | 'past' {
    const now = Date.now();
    const start = +new Date(event.start_time);
    const end = +new Date(event.end_time);
    if (end < now) return 'past';
    if (start <= now && end >= now) return 'live';
    return 'upcoming';
  }

  cancelReservation(row: GuestRow): void {
    const msg = this.i18n.t('guestList.confirmCancel', { name: row.guestName }) || `Cancel reservation for ${row.guestName}?`;
    if (!confirm(msg)) return;
    this.venues.cancelReservation(row.reservationId).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('guestList.cancelledToast') || 'Reservation cancelled.');
        const ev = this.selectedEvent();
        if (ev) this.loadGuests(ev.id);
      },
      error: () => this.toast.error(this.i18n.t('errors.generic')),
    });
  }

  viewTicket(ticketId: string): void {
    window.open(`/tickets/${ticketId}`, '_blank');
  }

  trackByReservation(_: number, row: GuestRow): string {
    return row.reservationId;
  }

  trackByEventId(_: number, event: EventSummary): string {
    return event.id;
  }
}
