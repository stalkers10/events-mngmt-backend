import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VenueService } from '../../core/services/venue.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-ticket-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-preview.component.html',
  styleUrl: './ticket-preview.component.scss'
})
export class TicketPreviewComponent implements OnInit {
  ticketId!: string;
  readonly ticket = signal<any | null>(null);
  readonly isLoading = signal(true);
  readonly isDownloading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private venues: VenueService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('ticketId');
    if (!id) {
      this.toast.error('No Ticket ID provided.');
      this.router.navigate(['/events']);
      return;
    }
    this.ticketId = id;
    this.loadTicketDetails();
  }

  loadTicketDetails(): void {
    this.isLoading.set(true);
    this.venues.getTicketDetails(this.ticketId).subscribe({
      next: (data) => {
        this.ticket.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.error('Failed to load ticket details.');
        this.isLoading.set(false);
      }
    });
  }

  downloadPdf(): void {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);
    this.venues.downloadTicketPdf(this.ticketId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket-${this.ticketId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isDownloading.set(false);
      },
      error: () => {
        this.toast.error('Failed to download PDF ticket.');
        this.isDownloading.set(false);
      }
    });
  }

  cancelTicket(): void {
    const t = this.ticket();
    if (!t) return;

    if (confirm(`Are you sure you want to cancel the reservation for ${t.invitee_name}?`)) {
      this.venues.cancelReservation(t.reservation_id).subscribe({
        next: () => {
          this.toast.success('Reservation cancelled successfully.');
          this.router.navigate(['/events', t.event_id, 'seating-map']);
        },
        error: () => {
          this.toast.error('Failed to cancel reservation.');
        }
      });
    }
  }

  goBack(): void {
    const t = this.ticket();
    if (t) {
      this.router.navigate(['/events', t.event_id, 'seating-map']);
    } else {
      this.router.navigate(['/events']);
    }
  }
}
