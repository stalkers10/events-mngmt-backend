import { Component, OnInit, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { EventSummary } from '../../core/models/dashboard.model';
import { EventOccupancy, OccupancyTable, OccupancyChair, VenueService } from '../../core/services/venue.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';

@Component({
  selector: 'app-seating-map',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nextPipe, FormsModule],
  templateUrl: './seating-map.component.html',
  styleUrl: './seating-map.component.scss',
})
export class SeatingMapComponent implements OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  readonly event = signal<EventSummary | null>(null);
  readonly occupancy = signal<EventOccupancy | null>(null);
  readonly isLoading = signal(true);

  readonly selectedChair = signal<OccupancyChair | null>(null);
  readonly selectedTable = signal<OccupancyTable | null>(null);

  inviteeName = '';
  inviteeEmail = '';
  inviteePhone = '';
  isAssigning = false;

  zoom = signal(0.9);
  pan = signal({ x: 40, y: 120 });
  isPanning = signal(false);
  panStart = signal({ x: 0, y: 0 });

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.isPanning.set(false);
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (this.isPanning()) {
      const dx = event.clientX - this.panStart().x;
      const dy = event.clientY - this.panStart().y;
      this.pan.update((p) => ({ x: p.x + dx, y: p.y + dy }));
      this.panStart.set({ x: event.clientX, y: event.clientY });
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) return;
    this.isLoading.set(true);
    forkJoin({ event: this.venues.event(eventId), occupancy: this.venues.occupancy(eventId) }).subscribe({
      next: ({ event, occupancy }) => {
        this.event.set(event);
        this.occupancy.set(occupancy);
        this.isLoading.set(false);

        // If a chair was selected, refresh its reference from the updated occupancy data
        const currentChair = this.selectedChair();
        if (currentChair) {
          const updatedTable = occupancy.tables.find((t) => t.id === this.selectedTable()?.id);
          const updatedChair = updatedTable?.chairs.find((c) => c.id === currentChair.id);
          if (updatedChair && updatedTable) {
            this.selectedChair.set(updatedChair);
            this.selectedTable.set(updatedTable);
          } else {
            this.closeSidebar();
          }
        }
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

  selectChair(table: OccupancyTable, chair: OccupancyChair): void {
    if (this.selectedChair()?.id === chair.id) {
      this.closeSidebar();
      return;
    }
    this.selectedTable.set(table);
    this.selectedChair.set(chair);

    if (!chair.reservation_id) {
      this.inviteeName = '';
      this.inviteeEmail = '';
      this.inviteePhone = '';
    }
  }

  closeSidebar(): void {
    this.selectedChair.set(null);
    this.selectedTable.set(null);
  }

  assignSeat(): void {
    const activeEvent = this.event();
    const table = this.selectedTable();
    const chair = this.selectedChair();

    if (!activeEvent || !table || !chair) return;

    if (!this.inviteeName.trim()) {
      this.toast.error(this.i18n.t('errors.fillAllFields') || 'Please enter guest name.');
      return;
    }

    this.isAssigning = true;
    const payload = {
      eventId: activeEvent.id,
      tableId: table.id,
      chairId: chair.id,
      invitee: {
        name: this.inviteeName.trim(),
        email: this.inviteeEmail.trim() || undefined,
        phone: this.inviteePhone.trim() || undefined,
      },
    };

    this.venues.createReservation(payload).subscribe({
      next: (res) => {
        this.isAssigning = false;
        this.toast.success('Seat assigned successfully.');
        this.closeSidebar();
        this.router.navigate(['/tickets', res.ticketId]);
      },
      error: (err) => {
        this.isAssigning = false;
        const msg = err.error?.error || 'Failed to assign seat.';
        this.toast.error(msg);
      },
    });
  }

  cancelReservation(reservationId: string): void {
    if (confirm('Are you sure you want to cancel this reservation and ticket?')) {
      this.venues.cancelReservation(reservationId).subscribe({
        next: () => {
          this.toast.success('Reservation cancelled successfully.');
          this.loadData();
        },
        error: () => {
          this.toast.error('Failed to cancel reservation.');
        },
      });
    }
  }

  viewTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(z + 0.1, 3));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(z - 0.1, 0.3));
  }

  resetView(): void {
    this.zoom.set(0.9);
    this.pan.set({ x: 40, y: 120 });
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey) {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      this.zoom.update((z) => Math.min(Math.max(z + delta, 0.3), 3));
    } else {
      this.pan.update((p) => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }));
    }
  }

  onCanvasMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.classList.contains('canvas-viewport') ||
      target.classList.contains('grid-background') ||
      target.classList.contains('stage-label') ||
      target.classList.contains('stage-banner')
    ) {
      if (event.button === 0 || event.button === 1) {
        event.preventDefault();
        this.isPanning.set(true);
        this.panStart.set({ x: event.clientX, y: event.clientY });
      }
    }
  }

  getTableSize(chairs: number): number {
    return 60 + chairs * 2;
  }

  getTableX(table: OccupancyTable): number {
    if (table.position) {
      const parts = table.position.split(',');
      if (parts.length === 2) {
        const x = parseFloat(parts[0]);
        if (!isNaN(x)) return x;
      }
    }
    return 100;
  }

  getTableY(table: OccupancyTable): number {
    if (table.position) {
      const parts = table.position.split(',');
      if (parts.length === 2) {
        const y = parseFloat(parts[1]);
        if (!isNaN(y)) return y;
      }
    }
    return 100;
  }

  getChairPositions(table: OccupancyTable): { left: number; top: number; angle: number; chair: OccupancyChair }[] {
    const positions: { left: number; top: number; angle: number; chair: OccupancyChair }[] = [];
    const center = 50;
    const radius = 65;
    const chairsCount = table.chairs.length;

    for (let i = 0; i < chairsCount; i++) {
      const angle = (i / chairsCount) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        left: center + radius * Math.cos(angle),
        top: center + radius * Math.sin(angle),
        angle: (angle * 180) / Math.PI,
        chair: table.chairs[i],
      });
    }
    return positions;
  }
}
