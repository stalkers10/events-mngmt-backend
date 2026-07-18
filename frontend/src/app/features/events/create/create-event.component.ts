import { Component, signal, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18nextPipe } from '../../../core/pipes/i18next.pipe';
import { I18nextService } from '../../../core/services/i18next.service';
import { ToastService } from '../../../core/services/toast.service';
import { VenueService } from '../../../core/services/venue.service';

interface TableItem {
  id: number;
  x: number;
  y: number;
  chairs: number;
  selected: boolean;
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
  
  tables = signal<TableItem[]>([]);
  selectedTable = signal<TableItem | null>(null);
  isDragging = signal(false);
  dragStart = signal({ x: 0, y: 0 });
  zoom = signal(1);
  pan = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  panStart = signal({ x: 0, y: 0 });
  
  rooms = signal<any[]>([]);
  selectedRoom = signal<string>('');

  constructor(
    private router: Router,
    private venues: VenueService,
    private toast: ToastService,
    private i18n: I18nextService
  ) {}

  ngAfterViewInit(): void {
    this.loadRooms();
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.isDragging.set(false);
    this.isPanning.set(false);
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (this.isDragging() && this.selectedTable()) {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newX = (event.clientX - rect.left - this.pan().x) / this.zoom() - this.dragStart().x;
      const newY = (event.clientY - rect.top - this.pan().y) / this.zoom() - this.dragStart().y;
      this.tables.update(tabs => tabs.map(t => 
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

  getTableSize(chairs: number): number {
    return 60 + (chairs * 2); 
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
        selected: false
      });
    }
    this.tables.set(newTables);
  }

  onTableClick(table: TableItem, event: MouseEvent): void {
    event.stopPropagation();
    this.tables.update(tabs => tabs.map(t => ({ ...t, selected: t.id === table.id })));
    this.selectedTable.set({ ...table, selected: true });
  }

  onCanvasClick(): void {
    this.tables.update(tabs => tabs.map(t => ({ ...t, selected: false })));
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
    this.isDragging.set(true);
    this.dragStart.set({
      x: (event.clientX - this.pan().x) / this.zoom() - table.x,
      y: (event.clientY - this.pan().y) / this.zoom() - table.y
    });
    this.tables.update(tabs => tabs.map(t => ({ ...t, selected: t.id === table.id })));
    this.selectedTable.set({ ...table, selected: true });
  }

  updateChairs(chairs: number): void {
    if (this.selectedTable()) {
      this.tables.update(tabs => tabs.map(t => t.id === this.selectedTable()!.id ? { ...t, chairs } : t));
      this.selectedTable.update(t => t ? { ...t, chairs } : null);
    }
  }

  removeTable(): void {
    if (this.selectedTable()) {
      this.tables.update(tabs => tabs.filter(t => t.id !== this.selectedTable()!.id));
      this.selectedTable.set(null);
    }
  }

getChairPositions(table: TableItem): { left: number; top: number; angle: number }[] {
    const positions: { left: number; top: number; angle: number }[] = [];
    // Use percentages: center at 50%, radius at 42% of container size
    const center = 50;
    const radius = 42;
    
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

  async createEvent(): Promise<void> {
    if (!this.eventName() || !this.startTime() || !this.endTime() || !this.selectedRoom()) {
      this.toast.error(this.i18n.t('errors.fillAllFields'));
      return;
    }
    if (this.tables().length === 0) {
      this.toast.error(this.i18n.t('events.noTables'));
      return;
    }

    const tables = this.tables().map(t => ({
      tableNumber: String(t.id),
      position: `${Math.round(t.x)},${Math.round(t.y)}`,
      numberOfChairs: t.chairs
    }));

    const startIso = new Date(this.startTime()).toISOString();
    const endIso = new Date(this.endTime()).toISOString();

    this.venues.createEvent({
      roomId: this.selectedRoom(),
      name: this.eventName(),
      startTime: startIso,
      endTime: endIso,
      tables
    }).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('events.createdToast'));
        this.router.navigate(['/events']);
      },
      error: (err) => this.toast.error(err.error?.error || this.i18n.t('errors.createFailed'))
    });
  }

  trackByTableId(index: number, table: TableItem): number {
    return table.id;
  }
}