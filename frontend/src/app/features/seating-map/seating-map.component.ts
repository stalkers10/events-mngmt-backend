import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { EventSummary } from '../../core/models/dashboard.model';
import { EventOccupancy, OccupancyTable, VenueService } from '../../core/services/venue.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';

@Component({
  selector: 'app-seating-map',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nextPipe],
  templateUrl: './seating-map.component.html',
  styleUrl: './seating-map.component.scss',
})
export class SeatingMapComponent implements OnInit {
  readonly event = signal<EventSummary | null>(null);
  readonly occupancy = signal<EventOccupancy | null>(null);
  readonly isLoading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService
  ) {}

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) return;
    forkJoin({ event: this.venues.event(eventId), occupancy: this.venues.occupancy(eventId) }).subscribe({
      next: ({ event, occupancy }) => {
        this.event.set(event);
        this.occupancy.set(occupancy);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  reservedSeats(): number {
    return this.occupancy()?.tables.reduce((count, table) => count + table.chairs.filter((chair) => !!chair.reservation_id).length, 0) ?? 0;
  }

  totalSeats(): number {
    return this.occupancy()?.tables.reduce((count, table) => count + table.chairs.length, 0) ?? 0;
  }

  tableReservedSeats(table: OccupancyTable): number {
    return table.chairs.filter((chair) => !!chair.reservation_id).length;
  }
}
