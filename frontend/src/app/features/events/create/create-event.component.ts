import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18nextPipe } from '../../../core/pipes/i18next.pipe';
import { I18nextService } from '../../../core/services/i18next.service';
import { ToastService } from '../../../core/services/toast.service';
import { VenueService } from '../../../core/services/venue.service';
import { tableCircleSize } from '../../../core/utils/table-size';

interface TableItem {
  id: number;
  x: number;
  y: number;
  chairs: number;
  selected: boolean;
  name: string;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, I18nextPipe],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  eventName = signal('');
  startTime = signal('');
  endTime = signal('');
  tableCount = signal(1);
  chairsPerTable = signal(4);

  tablesByRoom = signal<Record<string, TableItem[]>>({});
  activeRoomId = signal('');
  selectedTable = signal<TableItem | null>(null);
  roomDropdownOpen = signal(false);
  isDragging = signal(false);
  dragStart = signal({ x: 0, y: 0 });
  zoom = signal(1);
  pan = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  panStart = signal({ x: 0, y: 0 });

  leftPanelWidth = signal(400);
  isResizing = signal(false);

  rooms = signal<any[]>([]);
  selectedRoomIds = signal<string[]>([]);
  submitted = signal(false);

  /** Tables being configured for the currently active room. */
  readonly currentTables = computed<TableItem[]>(
    () => this.tablesByRoom()[this.activeRoomId()] ?? []
  );

  /** The event's selected rooms, for the room-switcher tabs. */
  readonly selectedRooms = computed<any[]>(() =>
    this.rooms().filter((r) => this.selectedRoomIds().includes(r.id))
  );

  private setCurrentTables(next: TableItem[]): void {
    const roomId = this.activeRoomId();
    if (!roomId) return;
    this.tablesByRoom.update((map) => ({ ...map, [roomId]: next }));
  }

  private updateCurrentTables(fn: (tabs: TableItem[]) => TableItem[]): void {
    const roomId = this.activeRoomId();
    if (!roomId) return;
    this.tablesByRoom.update((map) => ({
      ...map,
      [roomId]: fn(map[roomId] ?? []),
    }));
  }

  constructor(
    private router: Router,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService
  ) {}

  selectedRoomLabel(): string {
    const floorLabel = this.i18n.t('events.floor');
    return this.selectedRooms()
      .map((room) => `${room.room_number} · ${floorLabel} ${room.floor_number}`)
      .join(', ');
  }

  toggleRoomDropdown(): void {
    this.roomDropdownOpen.update((current) => !current);
  }

  toggleRoomSelection(roomId: string): void {
    this.selectedRoomIds.update((current) => {
      const next = current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId];

      if (next.length === 0) {
        this.activeRoomId.set('');
      } else if (!next.includes(this.activeRoomId())) {
        this.activeRoomId.set(next[0]);
      }

      if (!next.includes(roomId)) {
        this.tablesByRoom.update((map) => {
          const { [roomId]: removed, ...remaining } = map;
          return remaining;
        });
      }

      return next;
    });
  }

  ngAfterViewInit(): void {
    this.loadRooms();
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.isDragging.set(false);
    this.isPanning.set(false);
    this.isResizing.set(false);
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (this.isResizing()) {
      const newWidth = Math.max(300, Math.min(600, event.clientX - 24));
      this.leftPanelWidth.set(newWidth);
      return;
    }

    if (this.isDragging() && this.selectedTable()) {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newX = (event.clientX - rect.left - this.pan().x) / this.zoom() - this.dragStart().x;
      const newY = (event.clientY - rect.top - this.pan().y) / this.zoom() - this.dragStart().y;
      this.updateCurrentTables(tabs => tabs.map(t =>
        t.id === this.selectedTable()!.id ? { ...t, x: newX, y: newY } : t
      ));
      this.selectedTable.update(t => t ? { ...t, x: newX, y: newY } : null);
    }
    if (this.isPanning()) {
      const dx = event.clientX - this.panStart().x;
      const dy = event.clientY - this.panStart().y;
      this.pan.update(p => ({ x: p.x + dx, y: p.y + dy }));
      this.panStart.set({ x: event.clientX, y: event.clientY });
    }
  }

  onResizerMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);
  }

  getTableSize(chairs: number, label?: string): number {
    return tableCircleSize(chairs, label);
  }

  round(value: number): number {
    return Math.round(value);
  }

  loadRooms(): void {
    this.venues.rooms().subscribe({
      next: (rooms) => this.rooms.set(rooms),
      error: () => this.toast.error(this.i18n.t('errors.loadFailed'))
    });
  }

  generateLayout(): void {
    const newTables: TableItem[] = [];
    const cols = 3;
    const spacingX = 220;
    const spacingY = 220;
    const startX = 60;
    const startY = 60;

    for (let i = 0; i < this.tableCount(); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      newTables.push({
        id: i + 1,
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        chairs: this.chairsPerTable(),
        selected: false,
        name: ''
      });
    }
    this.setCurrentTables(newTables);
  }

  onTableClick(table: TableItem, event: MouseEvent): void {
    event.stopPropagation();
    this.updateCurrentTables(tabs => tabs.map(t => ({ ...t, selected: t.id === table.id })));
    this.selectedTable.set({ ...table, selected: true });
  }

  onCanvasClick(): void {
    this.updateCurrentTables(tabs => tabs.map(t => ({ ...t, selected: false })));
    this.selectedTable.set(null);
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      event.preventDefault();
      this.isPanning.set(true);
      this.panStart.set({ x: event.clientX, y: event.clientY });
    }
  }

  onTableMouseDown(table: TableItem, event: MouseEvent): void {
    event.stopPropagation();
    if (event.button !== 0) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.isDragging.set(true);
    this.dragStart.set({
      x: (event.clientX - rect.left - this.pan().x) / this.zoom() - table.x,
      y: (event.clientY - rect.top - this.pan().y) / this.zoom() - table.y
    });
    this.updateCurrentTables(tabs => tabs.map(t => ({ ...t, selected: t.id === table.id })));
    this.selectedTable.set({ ...table, selected: true });
  }

  updateChairs(chairs: number): void {
    if (this.selectedTable()) {
      this.updateCurrentTables(tabs => tabs.map(t => t.id === this.selectedTable()!.id ? { ...t, chairs } : t));
      this.selectedTable.update(t => t ? { ...t, chairs } : null);
    }
  }

  updateName(name: string): void {
    if (this.selectedTable()) {
      this.updateCurrentTables(tabs => tabs.map(t => t.id === this.selectedTable()!.id ? { ...t, name } : t));
      this.selectedTable.update(t => t ? { ...t, name } : null);
    }
  }

  removeTable(): void {
    if (this.selectedTable()) {
      this.updateCurrentTables(tabs => tabs.filter(t => t.id !== this.selectedTable()!.id));
      this.selectedTable.set(null);
    }
  }

getChairPositions(table: TableItem): { left: number; top: number; angle: number }[] {
    const positions: { left: number; top: number; angle: number }[] = [];
    const center = 50;
    const radius = 65; // Increased to place chairs outside the table surface

    for (let i = 0; i < table.chairs; i++) {
      const angle = (i / table.chairs) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        left: center + radius * Math.cos(angle),
        top: center + radius * Math.sin(angle),
        angle: angle * 180 / Math.PI
      });
    }
    return positions;
  }

  zoomIn(): void {
    this.zoom.update(z => Math.min(z + 0.1, 3));
  }

  zoomOut(): void {
    this.zoom.update(z => Math.max(z - 0.1, 0.3));
  }

  resetView(): void {
    this.zoom.set(1);
    this.pan.set({ x: 0, y: 0 });
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey) {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      this.zoom.update(z => Math.min(Math.max(z + delta, 0.3), 3));
    } else {
      this.pan.update(p => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }));
    }
  }


  isRoomSelected(roomId: string): boolean {
    return this.selectedRoomIds().includes(roomId);
  }

  setActiveRoom(roomId: string): void {
    if (this.selectedRoomIds().includes(roomId)) {
      this.activeRoomId.set(roomId);
    }
  }

  roomTableCount(roomId: string): number {
    return this.tablesByRoom()[roomId]?.length ?? 0;
  }

  minStartTime(): string {
    return this.formatDateTimeLocal(new Date());
  }

  minEndTime(): string {
    const now = new Date();
    const startTimeValue = this.startTime();
    if (!startTimeValue) {
      return this.formatDateTimeLocal(now);
    }
    const start = new Date(startTimeValue);
    const minDate = start > now ? start : now;
    return this.formatDateTimeLocal(minDate);
  }

  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async createEvent(): Promise<void> {
    this.submitted.set(true);
    const selectedRoomIds = this.selectedRoomIds();
    if (!this.eventName() || !this.startTime() || !this.endTime() || selectedRoomIds.length === 0) {
      this.toast.error(this.i18n.t('errors.fillAllFields'));
      return;
    }

    const startDate = new Date(this.startTime());
    const endDate = new Date(this.endTime());
    const now = new Date();

    if (startDate.getTime() < now.getTime()) {
      this.toast.error(this.i18n.t('errors.startTimeInPast'));
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      this.toast.error(this.i18n.t('events.endBeforeStart'));
      return;
    }

    const missingRooms = selectedRoomIds.filter((roomId) => (this.tablesByRoom()[roomId] ?? []).length === 0);
    if (missingRooms.length > 0) {
      this.toast.error(this.i18n.t('errors.roomNotConfigured'));
      return;
    }

    const allTables = selectedRoomIds.flatMap((roomId) =>
      (this.tablesByRoom()[roomId] ?? []).map((t) => ({
        roomId,
        tableNumber: (t.name && t.name.trim()) ? t.name.trim() : String(t.id),
        position: `${Math.round(t.x)},${Math.round(t.y)}`,
        numberOfChairs: t.chairs,
      }))
    );

    if (allTables.length === 0) {
      this.toast.error(this.i18n.t('events.noTables'));
      return;
    }

    const startIso = new Date(this.startTime()).toISOString();
    const endIso = new Date(this.endTime()).toISOString();

    this.venues.createEvent({
      roomIds: selectedRoomIds,
      roomId: selectedRoomIds[0],
      name: this.eventName(),
      startTime: startIso,
      endTime: endIso,
      tables: allTables
    }).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('events.createdToast'));
        this.router.navigate(['/events']);
      },
      error: (err) => {
        const serverError = err.error?.error;
        if (serverError === 'Event start time cannot be in the past') {
          this.toast.error(this.i18n.t('errors.startTimeInPast'));
        } else if (serverError === 'Start time must be before end time') {
          this.toast.error(this.i18n.t('events.endBeforeStart'));
        } else {
          this.toast.error(serverError || this.i18n.t('errors.createFailed'));
        }
      }
    });
  }

  trackByTableId(index: number, table: TableItem): number {
    return table.id;
  }
}
