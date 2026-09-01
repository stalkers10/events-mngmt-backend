import {
  Component, signal, computed, ViewChild, ElementRef,
  AfterViewInit, OnInit, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { I18nextPipe } from '../../../core/pipes/i18next.pipe';
import { I18nextService } from '../../../core/services/i18next.service';
import { ToastService } from '../../../core/services/toast.service';
import { VenueService, PublishEventPayload, EventSession } from '../../../core/services/venue.service';
import { UpgradeService } from '../../../core/services/upgrade.service';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { tableCircleSize } from '../../../core/utils/table-size';
import { relaxTableLayout } from '../../../core/utils/table-layout';
import { planLimitFromError } from '../../../core/utils/plan-limit.util';
import { toErrorMessage } from '../../../core/utils/http-error.util';
import { EventSummary } from '../../../core/models/dashboard.model';

interface TableItem {
  id: number;
  x: number;
  y: number;
  chairs: number;
  selected: boolean;
  name: string;
}

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, I18nextPipe, CustomSelectComponent],
  templateUrl: './edit-event.component.html',
  styleUrls: ['./edit-event.component.scss'],
})
export class EditEventComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  // ── Route state ──────────────────────────────────────────────────────────
  eventId = '';
  event = signal<EventSummary | null>(null);
  isLoading = signal(true);

  // ── Form fields ──────────────────────────────────────────────────────────
  eventName = signal('');
  startTime = signal('');
  endTime = signal('');
  tableCount = signal(1);
  chairsPerTable = signal(4);

  // ── Room selection ───────────────────────────────────────────────────────
  rooms = signal<any[]>([]);
  selectedRoomIds = signal<string[]>([]);
  roomDropdownOpen = signal(false);

  // ── Canvas / table state ─────────────────────────────────────────────────
  tablesByRoom = signal<Record<string, TableItem[]>>({});
  activeRoomId = signal('');
  selectedTable = signal<TableItem | null>(null);
  isDragging = signal(false);
  dragStart = signal({ x: 0, y: 0 });
  zoom = signal(1);
  pan = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  panStart = signal({ x: 0, y: 0 });

  // ── Layout resizer ───────────────────────────────────────────────────────
  leftPanelWidth = signal(400);
  isResizing = signal(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  submitted = signal(false);
  isSaving = signal(false);
  isPublishing = signal(false);
  isSavingSessions = signal(false);

  // ── Sessions ──────────────────────────────────────────────────────────────
  sessions = signal<EventSession[]>([]);

  addSession(): void {
    this.sessions.update((s) => [...s, { label: '', datetime: '', location: '' }]);
  }

  removeSession(index: number): void {
    this.sessions.update((s) => s.filter((_, i) => i !== index));
  }

  updateSession(index: number, field: keyof EventSession, value: string): void {
    this.sessions.update((s) =>
      s.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  saveSessions(): void {
    this.isSavingSessions.set(true);
    // Convert datetime-local strings to ISO-8601 for storage
    const payload = this.sessions().map((s) => ({
      label:    s.label.trim(),
      datetime: s.datetime ? new Date(s.datetime).toISOString() : '',
      location: s.location.trim(),
    }));
    this.venues.updateSessions(this.eventId, payload).subscribe({
      next: (ev) => {
        this.isSavingSessions.set(false);
        // Re-sync from server response
        this.sessions.set(
          (ev.sessions ?? []).map((s) => ({
            ...s,
            datetime: s.datetime ? this.toDateTimeLocalString(new Date(s.datetime)) : '',
          }))
        );
        this.toast.success(this.i18n.t('events.sessions.saved'));
      },
      error: () => {
        this.isSavingSessions.set(false);
        this.toast.error(this.i18n.t('errors.generic'));
      },
    });
  }

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly currentTables = computed<TableItem[]>(
    () => this.tablesByRoom()[this.activeRoomId()] ?? []
  );

  readonly selectedRooms = computed<any[]>(() =>
    this.rooms().filter((r) => this.selectedRoomIds().includes(r.id))
  );

  readonly previewRoomOptions = computed<SelectOption[]>(() => {
    const floor = this.i18n.t('events.floor');
    const tablesLabel = this.i18n.t('events.tablesLabel');
    return this.selectedRooms().map((room) => ({
      value: room.id,
      label: `${room.room_number} · ${floor} ${room.floor_number} (${this.roomTableCount(room.id)} ${tablesLabel})`,
    }));
  });

  get isDraft(): boolean {
    return this.event()?.status === 'DRAFT';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
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
    private route: ActivatedRoute,
    private router: Router,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService,
    private upgrade: UpgradeService,
  ) {}

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
    this.loadAll();
  }

  ngAfterViewInit(): void {}

  // ── Data loading ─────────────────────────────────────────────────────────

  private loadAll(): void {
    this.isLoading.set(true);

    this.venues.rooms().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loadEvent();
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  private loadEvent(): void {
    this.venues.event(this.eventId).subscribe({
      next: (event) => {
        this.event.set(event);
        this.prefill(event);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.i18n.t('errors.loadFailed'));
      },
    });
  }

  private prefill(event: EventSummary): void {
    this.eventName.set(event.name ?? '');

    if (event.start_time) {
      this.startTime.set(this.toDateTimeLocalString(new Date(event.start_time)));
    }
    if (event.end_time) {
      this.endTime.set(this.toDateTimeLocalString(new Date(event.end_time)));
    }

    const roomIds = event.room_ids && event.room_ids.length > 0
      ? event.room_ids
      : event.room_id ? [event.room_id] : [];
    this.selectedRoomIds.set(roomIds);
    if (roomIds.length > 0) {
      this.activeRoomId.set(roomIds[0]);
    }

    // Load sessions — convert stored ISO strings back to datetime-local format
    this.sessions.set(
      (event.sessions ?? []).map((s) => ({
        ...s,
        datetime: s.datetime ? this.toDateTimeLocalString(new Date(s.datetime)) : '',
      }))
    );
  }

  // ── Host listeners ───────────────────────────────────────────────────────

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
      this.updateCurrentTables((tabs) =>
        tabs.map((t) => (t.id === this.selectedTable()!.id ? { ...t, x: newX, y: newY } : t))
      );
      this.selectedTable.update((t) => (t ? { ...t, x: newX, y: newY } : null));
    }
    if (this.isPanning()) {
      const dx = event.clientX - this.panStart().x;
      const dy = event.clientY - this.panStart().y;
      this.pan.update((p) => ({ x: p.x + dx, y: p.y + dy }));
      this.panStart.set({ x: event.clientX, y: event.clientY });
    }
  }

  onResizerMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);
  }

  // ── Room selection ───────────────────────────────────────────────────────

  selectedRoomLabel(): string {
    const floorLabel = this.i18n.t('events.floor');
    return this.selectedRooms()
      .map((room) => `${room.room_number} · ${floorLabel} ${room.floor_number}`)
      .join(', ');
  }

  toggleRoomDropdown(): void {
    this.roomDropdownOpen.update((c) => !c);
  }

  isRoomSelected(roomId: string): boolean {
    return this.selectedRoomIds().includes(roomId);
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
          const { [roomId]: _removed, ...remaining } = map;
          return remaining;
        });
      }
      return next;
    });
  }

  setActiveRoom(roomId: string): void {
    if (!this.selectedRoomIds().includes(roomId)) return;
    this.activeRoomId.set(roomId);
    const tables = this.tablesByRoom()[roomId] ?? [];
    this.tableCount.set(tables.length);
    this.chairsPerTable.set(tables.length > 0 ? tables[0].chairs : this.chairsPerTable());
  }

  roomTableCount(roomId: string): number {
    return this.tablesByRoom()[roomId]?.length ?? 0;
  }

  // ── Canvas / table actions ────────────────────────────────────────────────

  getTableSize(chairs: number, label?: string): number {
    return tableCircleSize(chairs, label);
  }

  round(value: number): number {
    return Math.round(value);
  }

  generateLayout(): void {
    const cols = 3;
    const spacingX = 220;
    const spacingY = 220;
    const startX = 60;
    const startY = 60;
    const newTables: TableItem[] = [];
    for (let i = 0; i < this.tableCount(); i++) {
      newTables.push({
        id: i + 1,
        x: startX + (i % cols) * spacingX,
        y: startY + Math.floor(i / cols) * spacingY,
        chairs: this.chairsPerTable(),
        selected: false,
        name: '',
      });
    }
    this.setCurrentTables(newTables);
    this.relayoutActiveRoom();
  }

  relayoutActiveRoom(): void {
    const tables = this.currentTables();
    if (tables.length === 0) return;
    const relaxed = relaxTableLayout(
      tables.map((t) => ({ id: String(t.id), chairs: t.chairs, label: t.name, x: t.x, y: t.y })),
    );
    const byId = new Map(relaxed.map((r) => [r.id, r]));
    this.updateCurrentTables((tabs) =>
      tabs.map((t) => {
        const r = byId.get(String(t.id));
        return r ? { ...t, x: r.x, y: r.y } : t;
      }),
    );
  }

  onTableClick(table: TableItem, event: MouseEvent): void {
    event.stopPropagation();
    this.updateCurrentTables((tabs) => tabs.map((t) => ({ ...t, selected: t.id === table.id })));
    this.selectedTable.set({ ...table, selected: true });
  }

  onCanvasClick(): void {
    this.updateCurrentTables((tabs) => tabs.map((t) => ({ ...t, selected: false })));
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
      y: (event.clientY - rect.top - this.pan().y) / this.zoom() - table.y,
    });
    this.updateCurrentTables((tabs) => tabs.map((t) => ({ ...t, selected: t.id === table.id })));
    this.selectedTable.set({ ...table, selected: true });
  }

  updateChairs(chairs: number): void {
    if (!this.selectedTable()) return;
    this.updateCurrentTables((tabs) =>
      tabs.map((t) => (t.id === this.selectedTable()!.id ? { ...t, chairs } : t))
    );
    this.selectedTable.update((t) => (t ? { ...t, chairs } : null));
  }

  updateName(name: string): void {
    if (!this.selectedTable()) return;
    this.updateCurrentTables((tabs) =>
      tabs.map((t) => (t.id === this.selectedTable()!.id ? { ...t, name } : t))
    );
    this.selectedTable.update((t) => (t ? { ...t, name } : null));
    this.relayoutActiveRoom();
  }

  removeTable(): void {
    if (!this.selectedTable()) return;
    this.updateCurrentTables((tabs) => tabs.filter((t) => t.id !== this.selectedTable()!.id));
    this.selectedTable.set(null);
  }

  getChairPositions(table: TableItem): { left: number; top: number; angle: number }[] {
    const center = 50;
    const radius = 65;
    return Array.from({ length: table.chairs }, (_, i) => {
      const angle = (i / table.chairs) * 2 * Math.PI - Math.PI / 2;
      return {
        left: center + radius * Math.cos(angle),
        top: center + radius * Math.sin(angle),
        angle: (angle * 180) / Math.PI,
      };
    });
  }

  zoomIn(): void { this.zoom.update((z) => Math.min(z + 0.1, 3)); }
  zoomOut(): void { this.zoom.update((z) => Math.max(z - 0.1, 0.3)); }
  resetView(): void { this.zoom.set(1); this.pan.set({ x: 0, y: 0 }); }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey) {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      this.zoom.update((z) => Math.min(Math.max(z + delta, 0.3), 3));
    } else {
      this.pan.update((p) => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }));
    }
  }

  trackByTableId(_index: number, table: TableItem): number {
    return table.id;
  }

  // ── Time helpers ─────────────────────────────────────────────────────────

  minStartTime(): string {
    return this.toDateTimeLocalString(new Date());
  }

  minEndTime(): string {
    const now = new Date();
    const startVal = this.startTime();
    if (!startVal) return this.toDateTimeLocalString(now);
    const start = new Date(startVal);
    return this.toDateTimeLocalString(start > now ? start : now);
  }

  private toDateTimeLocalString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // ── Build shared tables payload ───────────────────────────────────────────

  private buildTablesPayload() {
    const selectedRoomIds = this.selectedRoomIds();
    return selectedRoomIds.flatMap((roomId) =>
      (this.tablesByRoom()[roomId] ?? []).map((t) => ({
        roomId,
        tableNumber: (t.name && t.name.trim()) ? t.name.trim() : String(t.id),
        position: `${Math.round(t.x)},${Math.round(t.y)}`,
        numberOfChairs: t.chairs,
      }))
    );
  }

  // ── Save Changes (update without publishing) ─────────────────────────────

  saveChanges(): void {
    const name = this.eventName().trim();
    if (!name) {
      this.toast.error(this.i18n.t('events.nameRequired'));
      return;
    }

    const selectedRoomIds = this.selectedRoomIds();
    const startVal = this.startTime();
    const endVal = this.endTime();

    // For a published event, all fields are required
    if (!this.isDraft && (!startVal || !endVal || selectedRoomIds.length === 0)) {
      this.toast.error(this.i18n.t('errors.fillAllFields'));
      return;
    }

    this.isSaving.set(true);

    // If rooms and times are filled, do a full update; otherwise just update name
    if (selectedRoomIds.length > 0 && startVal && endVal) {
      this.venues.updateEvent(this.eventId, {
        roomIds: selectedRoomIds,
        roomId: selectedRoomIds[0],
        name,
        startTime: new Date(startVal).toISOString(),
        endTime: new Date(endVal).toISOString(),
      }).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.event.set(updated);
          this.toast.success(this.i18n.t('events.savedToast'));
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = toErrorMessage(err.error?.error ?? err.error);
          this.toast.error(msg || this.i18n.t('errors.generic'));
        },
      });
    } else {
      // Only name changed — use a draft-aware update (just PUT with current or empty rooms)
      // For drafts with no room yet, we just note the name change locally and skip API
      // (backend would reject roomIds=[] on PUT). Store locally until publish.
      this.isSaving.set(false);
      this.toast.success(this.i18n.t('events.savedToast'));
    }
  }

  // ── Publish ──────────────────────────────────────────────────────────────

  publishEvent(): void {
    this.submitted.set(true);
    const name = this.eventName().trim();
    const selectedRoomIds = this.selectedRoomIds();
    const startVal = this.startTime();
    const endVal = this.endTime();

    if (!name || selectedRoomIds.length === 0 || !startVal || !endVal) {
      this.toast.error(this.i18n.t('errors.fillAllFields'));
      return;
    }

    const startDate = new Date(startVal);
    const endDate = new Date(endVal);

    if (startDate.getTime() < Date.now()) {
      this.toast.error(this.i18n.t('errors.startTimeInPast'));
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      this.toast.error(this.i18n.t('events.endBeforeStart'));
      return;
    }

    const tables = this.buildTablesPayload();
    const payload: PublishEventPayload = {
      roomIds: selectedRoomIds,
      name,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      tables: tables.length > 0 ? tables : undefined,
    };

    this.isPublishing.set(true);
    this.venues.publishEvent(this.eventId, payload).subscribe({
      next: () => {
        this.isPublishing.set(false);
        this.toast.success(this.i18n.t('events.publishedToast'));
        this.router.navigate(['/events']);
      },
      error: (err) => {
        this.isPublishing.set(false);
        const limit = planLimitFromError(err);
        if (limit) {
          this.toast.warning(limit.reason);
          setTimeout(() => this.upgrade.show(limit), 350);
          return;
        }
        const msg = toErrorMessage(err.error?.error ?? err.error);
        if (msg?.includes('past')) {
          this.toast.error(this.i18n.t('errors.startTimeInPast'));
        } else if (msg?.includes('end time')) {
          this.toast.error(this.i18n.t('events.endBeforeStart'));
        } else {
          this.toast.error(msg || this.i18n.t('errors.createFailed'));
        }
      },
    });
  }
}
