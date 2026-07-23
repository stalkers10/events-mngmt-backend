import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventSummary, Room, Building } from '../../core/models/dashboard.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
type RoomStatus = 'available' | 'active' | 'reserved';

@Component({ 
  selector: 'app-dashboard',
  standalone: true, 
  imports: [CommonModule, DatePipe, RouterLink, I18nextPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly rooms = signal<Room[]>([]);
  readonly events = signal<EventSummary[]>([]);
  readonly buildings = signal<Building[]>([]);
  readonly isLoading = signal(true);

  constructor(
    private dashboard: DashboardService,
    private toast: ToastService,
    public translation: I18nextService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    forkJoin({ rooms: this.dashboard.rooms(), events: this.dashboard.events(), buildings: this.dashboard.buildings() }).subscribe({
      next: ({ rooms, events, buildings }) => {
        this.rooms.set(rooms);
        this.events.set([...events].sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time))); 
        this.buildings.set(buildings);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(this.translation.t('errors.loadFailed'));
      },
    });
  }

  roomEvent(roomId: string): EventSummary | undefined {
    const now = Date.now();
    return this.events().find((event) =>
      event.room_id === roomId && +new Date(event.start_time) <= now && +new Date(event.end_time) >= now
    );
  }

  nextRoomEvent(roomId: string): EventSummary | undefined {
    const now = Date.now();
    return this.events().find((event) => event.room_id === roomId && +new Date(event.start_time) > now);
  }

  roomStatus(room: Room): RoomStatus {
    if (this.roomEvent(room.id)) return 'active';
    if (this.nextRoomEvent(room.id)) return 'reserved';
    return 'available';
  }

  displayedRooms(): Room[] {
    return [...this.rooms()].reverse().slice(0, 4);
  }

  displayedEvents(): EventSummary[] {
    const now = Date.now();
    return this.events().filter((event) => +new Date(event.start_time) <= now && +new Date(event.end_time) >= now).slice(0, 4);
  }

  roomFor(event: EventSummary): Room | undefined {
    return this.rooms().find((room) => room.id === event.room_id);
  }

  eventState(event: EventSummary): 'live' | 'upcoming' {
    const now = Date.now();
    return +new Date(event.start_time) <= now && +new Date(event.end_time) >= now ? 'live' : 'upcoming';
  }

  buildingFor(event: EventSummary): Building | undefined {
    return this.buildings().find((building) => building.id === event.room_id);
  }
}
