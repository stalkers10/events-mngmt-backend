import { Component, OnInit, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { EventSummary, Room } from '../../core/models/dashboard.model';
import { EventOccupancy, OccupancyTable, OccupancyChair, VenueService } from '../../core/services/venue.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { CustomSelectComponent, SelectOption } from '../../shared/components/custom-select/custom-select.component';
import { isEventFinished } from '../../core/utils/event-status';
import { describeHttpError } from '../../core/utils/http-error.util';
import { formatTableName } from '../../core/utils/table-name';
import { tableCircleSize } from '../../core/utils/table-size';
import { relaxTableLayout } from '../../core/utils/table-layout';

@Component({
  selector: 'app-seating-map',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nextPipe, FormsModule, ConfirmationDialogComponent, CustomSelectComponent],
  templateUrl: './seating-map.component.html',
  styleUrl: './seating-map.component.scss',
})
export class SeatingMapComponent implements OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  readonly event = signal<EventSummary | null>(null);
  readonly occupancy = signal<EventOccupancy | null>(null);
  readonly rooms = signal<Room[]>([]);
  readonly isLoading = signal(true);

  readonly selectedChair = signal<OccupancyChair | null>(null);
  readonly selectedTable = signal<OccupancyTable | null>(null);
  readonly selectedRoomId = signal('');
  readonly reservationType = signal<'SINGLE' | 'COUPLE'>('SINGLE');

  readonly tableNameDraft = signal('');
  readonly isSavingTable = signal(false);
  readonly formatTableName = formatTableName;

  readonly eventRooms = computed<Room[]>(() => {
    const activeEvent = this.event();
    if (!activeEvent) return [];
    const roomIds = activeEvent.room_ids && activeEvent.room_ids.length > 0
      ? activeEvent.room_ids
      : [activeEvent.room_id];
    return this.rooms()
      .filter((room) => roomIds.includes(room.id))
      .sort((a, b) => a.floor_number - b.floor_number || a.room_number.localeCompare(b.room_number));
  });

  readonly selectedRoomTables = computed<OccupancyTable[]>(() => {
    const selectedRoomId = this.selectedRoomId();
    return (this.occupancy()?.tables ?? []).filter((table) => table.room_id === selectedRoomId);
  });

  readonly roomOptions = computed<SelectOption[]>(() => {
    const floor = this.translation.t('events.floor');
    return this.eventRooms().map((room) => ({
      value: room.id,
      label: `${room.room_number} · ${floor} ${room.floor_number}`,
    }));
  });

  // When a couple reservation is being built, highlight the "next" chair that
  // will be auto-reserved for the partner. No wrap: the last chair has no
  // neighbor, so the couple toggle will surface an error on assign instead.
  readonly partnerPreviewChairId = computed<string | null>(() => {
    if (this.reservationType() !== 'COUPLE') return null;
    const chair = this.selectedChair();
    const table = this.selectedTable();
    if (!chair || !table || chair.reservation_id) return null;
    const idx = table.chairs.findIndex((c) => c.id === chair.id);
    if (idx < 0 || idx + 1 >= table.chairs.length) return null;
    const neighbor = table.chairs[idx + 1];
    if (neighbor.reservation_id) return null;
    return neighbor.id;
  });

  // Relaxed, overlap-free positions for the currently displayed room. Purely a
  // display transform — the stored `table.position` is never modified.
  readonly relaxedTables = computed<{ table: OccupancyTable; x: number; y: number }[]>(() => {
    const tables = this.selectedRoomTables();
    const relaxed = relaxTableLayout(
      tables.map((t) => ({
        id: t.id,
        chairs: t.chairs.length,
        label: t.table_number,
        x: this.getTableX(t),
        y: this.getTableY(t),
      })),
    );
    const byId = new Map(relaxed.map((r) => [r.id, r]));
    return tables.map((t) => {
      const r = byId.get(t.id)!;
      return { table: t, x: r.x, y: r.y };
    });
  });

  readonly isEventExpired = computed(() => {
    const activeEvent = this.event();
    return !!activeEvent && isEventFinished(activeEvent.end_time);
  });

  readonly showCancelReservationConfirmation = signal(false);
  readonly pendingCancelReservation = signal<{ reservationId: string; guestName: string } | null>(null);

  inviteeName = '';
  inviteeEmail = '';
  inviteePhone = '';
  isAssigning = false;

  zoom = signal(0.9);
  pan = signal({ x: 40, y: 120 });
  isPanning = signal(false);
  panStart = signal({ x: 0, y: 0 });
  activePointerId = signal<number | null>(null);
  private activePointers = new Map<number, { x: number; y: number }>();
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size === 0) {
      this.isPanning.set(false);
      this.activePointerId.set(null);
      this.pinchStartDistance = 0;
    }
  }

  @HostListener('window:pointercancel', ['$event'])
  onWindowPointerCancel(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size === 0) {
      this.isPanning.set(false);
      this.activePointerId.set(null);
      this.pinchStartDistance = 0;
    }
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    const stored = this.activePointers.get(event.pointerId);
    if (!stored) {
      return;
    }

    const pointerType = event.pointerType;
    const currentPoint = { x: event.clientX, y: event.clientY };
    this.activePointers.set(event.pointerId, currentPoint);

    if (this.activePointers.size === 2) {
      if (pointerType === 'touch') {
        event.preventDefault();
      }

      const points = Array.from(this.activePointers.values());
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const distance = Math.hypot(dx, dy);
      const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

      if (this.pinchStartDistance > 0) {
        const newZoom = Math.min(Math.max((distance / this.pinchStartDistance) * this.pinchStartZoom, 0.3), 3);
        const oldZoom = this.zoom();
        const worldX = (midpoint.x - this.pan().x) / oldZoom;
        const worldY = (midpoint.y - this.pan().y) / oldZoom;

        this.zoom.set(newZoom);
        this.pan.set({ x: midpoint.x - worldX * newZoom, y: midpoint.y - worldY * newZoom });
      }
    } else if (this.isPanning() && event.pointerId === this.activePointerId()) {
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
    public translation: I18nextService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) return;
    this.isLoading.set(true);
    forkJoin({
      event: this.venues.event(eventId),
      occupancy: this.venues.occupancy(eventId),
      rooms: this.venues.rooms()
    }).subscribe({
      next: ({ event, occupancy, rooms }) => {
        this.event.set(event);
        this.occupancy.set(occupancy);
        this.rooms.set(rooms);
        this.isLoading.set(false);

        // Default the room picker to the first active room. For multi-room events, prefer room_ids.
        const defaultRoomId = (event.room_ids && event.room_ids.length > 0) ? event.room_ids[0] : event.room_id;
        if (defaultRoomId) {
          this.selectedRoomId.set(defaultRoomId);
        }

        // Refresh the selected table reference from the updated occupancy data so
        // renames persist after a reload (works with or without a selected chair).
        const currentTable = this.selectedTable();
        if (currentTable) {
          const updatedTable = occupancy.tables.find((t) => t.id === currentTable.id);
          if (updatedTable) {
            if (this.selectedChair()) {
              const updatedChair = updatedTable.chairs.find((c) => c.id === this.selectedChair()!.id);
              if (updatedChair) {
                this.selectedChair.set(updatedChair);
              } else {
                this.selectedChair.set(null);
              }
            }
            this.selectedTable.set(updatedTable);
          } else {
            this.closeSidebar();
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.translation.t('errors.loadFailed'));
      },
    });
  }

  reservedSeats(): number {
    return this.occupancy()?.tables.reduce((count, table) =>
      count + table.chairs.filter((chair) => !!chair.reservation_id).length,
      0) ?? 0;
  }

  totalSeats(): number {
    return this.occupancy()?.tables.reduce((count, table) =>
      count + table.chairs.length,
      0) ?? 0;
  }

  tableReservedSeats(table: OccupancyTable): number {
    return table.chairs.filter((chair) => !!chair.reservation_id).length;
  }

  selectChair(table: OccupancyTable, chair: OccupancyChair): void {
    if (this.isEventExpired()) {
      this.toast.error(this.translation.t('seating.finished'));
      return;
    }
    if (this.selectedChair()?.id === chair.id) {
      this.closeSidebar();
      return;
    }
    this.selectedTable.set(table);
    this.selectedChair.set(chair);
    this.reservationType.set('SINGLE');

    if (!chair.reservation_id) {
      this.inviteeName = '';
      this.inviteeEmail = '';
      this.inviteePhone = '';
      // Keep the selected room aligned with the table being assigned.
      this.selectedRoomId.set(table.room_id || this.event()?.room_id || '');
    }
  }

  selectTable(table: OccupancyTable): void {
    if (this.isEventExpired()) {
      this.toast.error(this.translation.t('seating.finished'));
      return;
    }
    if (this.selectedTable()?.id === table.id && !this.selectedChair()) {
      this.closeSidebar();
      return;
    }
    this.selectedTable.set(table);
    this.selectedChair.set(null);
    this.tableNameDraft.set(table.table_number ?? '');
  }

  saveTableName(): void {
    const activeEvent = this.event();
    const table = this.selectedTable();
    if (!activeEvent || !table) return;

    if (this.isEventExpired()) {
      this.toast.error(this.translation.t('seating.finished'));
      return;
    }

    const name = this.tableNameDraft().trim();
    if (!name) {
      this.toast.error(this.translation.t('events.tableNameRequired') || 'Table name is required.');
      return;
    }

    this.isSavingTable.set(true);
    this.venues.updateTable(activeEvent.id, table.id, { tableNumber: name }).subscribe({
      next: () => {
        this.isSavingTable.set(false);
        this.toast.success(this.translation.t('events.tableNameSaved'));
        this.loadData();
      },
      error: (err: any) => {
        this.isSavingTable.set(false);
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  roomLabel(roomId: string | null | undefined): string {
    if (!roomId) return '—';
    const room = this.rooms().find((r) => r.id === roomId);
    return room ? `${room.room_number} · Floor ${room.floor_number}` : '—';
  }

  changeSelectedRoom(roomId: string): void {
    this.selectedRoomId.set(roomId);
    this.closeSidebar();
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

    if (this.isEventExpired()) {
      this.toast.error(this.translation.t('seating.finished'));
      return;
    }

    if (!this.inviteeName.trim()) {
      this.toast.error(this.translation.t('seating.guestNameRequired'));
      return;
    }

    this.isAssigning = true;

    const type = this.reservationType();
    let pairedChairId: string | undefined;
    if (type === 'COUPLE') {
      const idx = table.chairs.findIndex((c) => c.id === chair.id);
      if (idx < 0 || idx + 1 >= table.chairs.length) {
        this.isAssigning = false;
        this.toast.error(this.translation.t('seating.coupleNoAdjacent') || 'Cannot reserve a couple: no adjacent seat available.');
        return;
      }
      const neighbor = table.chairs[idx + 1];
      if (neighbor.reservation_id) {
        this.isAssigning = false;
        this.toast.error(this.translation.t('seating.chairUnavailableForCouple') || 'Cannot reserve a couple: the adjacent seat is already taken.');
        return;
      }
      pairedChairId = neighbor.id;
    }

    const payload = {
      eventId: activeEvent.id,
      tableId: table.id,
      chairId: chair.id,
      pairedChairId,
      roomId: this.selectedRoomId() || undefined,
      type,
      invitee: {
        name: this.inviteeName.trim(),
        email: this.inviteeEmail.trim() || undefined,
        phone: this.inviteePhone.trim() || undefined,
      },
    };

    this.venues.createReservation(payload).subscribe({
      next: (res) => {
        this.isAssigning = false;
        this.toast.success(
          type === 'COUPLE'
            ? this.translation.t('seating.coupleAssigned')
            : this.translation.t('seating.seatAssigned')
        );
        this.closeSidebar();
        this.router.navigate(['/tickets', res.ticketId]);
      },
      error: (err) => {
        this.isAssigning = false;
        const description = describeHttpError(err, 'generic');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }

  requestCancelReservation(reservationId: string, guestName: string): void {
    this.pendingCancelReservation.set({ reservationId, guestName });
    this.showCancelReservationConfirmation.set(true);
  }

  closeCancelReservationConfirmation(): void {
    this.showCancelReservationConfirmation.set(false);
    this.pendingCancelReservation.set(null);
  }

  confirmCancelReservation(): void {
    const pending = this.pendingCancelReservation();
    if (!pending) return;

    this.showCancelReservationConfirmation.set(false);
    this.pendingCancelReservation.set(null);

    this.venues.cancelReservation(pending.reservationId).subscribe({
      next: () => {
        this.toast.success(this.translation.t('seating.reservationCancelled'));
        this.loadData();
      },
      error: () => {
        this.toast.error(this.translation.t('seating.cancelFailed'));
      },
    });
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

  onCanvasPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.classList.contains('canvas-viewport') ||
      target.classList.contains('grid-background') ||
      target.classList.contains('stage-label') ||
      target.classList.contains('stage-banner')
    ) {
      if (event.button === 0 || event.button === 1) {
        if (event.pointerType !== 'touch') {
          event.preventDefault();
        }

        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (event.pointerType === 'touch' && this.activePointers.size === 2) {
          const points = Array.from(this.activePointers.values());
          const dx = points[1].x - points[0].x;
          const dy = points[1].y - points[0].y;
          this.pinchStartDistance = Math.hypot(dx, dy);
          this.pinchStartZoom = this.zoom();
          return;
        }

        this.isPanning.set(true);
        this.activePointerId.set(event.pointerId);
        this.panStart.set({ x: event.clientX, y: event.clientY });
      }
    }
  }

  getTableSize(chairs: number, label?: string | null): number {
    return tableCircleSize(chairs, label);
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
