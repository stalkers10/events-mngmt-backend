import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import jsQR from 'jsqr';
import { TicketService, TicketScanResult } from '../../core/services/ticket.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { I18nextService } from '../../core/services/i18next.service';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nextPipe],
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss'],
})

export class ScannerComponent implements OnInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  manualToken = '';
  isSubmitting = false;
  cameraSupported = true;
  scanResult: TicketScanResult | null = null;

  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private resetTimeoutId: number | null = null;

  constructor(
    private ticketService: TicketService,
    private i18n: I18nextService,
  ) {}

  ngOnInit(): void {
    this.openCamera();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async submitManualToken(): Promise<void> {
    const token = this.manualToken.trim();
    if (!token || this.isSubmitting) {
      return;
    }
    await this.executeScan(token);
  }

  private async openCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraSupported = false;
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = this.videoRef?.nativeElement;
      if (!video) {
        this.cameraSupported = false;
        return;
      }
      video.srcObject = this.stream;
      await video.play();
      this.cameraSupported = true;
      this.scheduleFrame();
    } catch {
      this.cameraSupported = false;
    }
  }

  private scheduleFrame(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
  }

  private scanFrame(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || !this.cameraSupported || this.scanResult) {
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.scheduleFrame();
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      this.scheduleFrame();
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      this.scheduleFrame();
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, width, height);
    if (code?.data) {
      this.pauseScanner();
      this.executeScan(code.data);
      return;
    }

    this.scheduleFrame();
  }

  private async executeScan(qrToken: string): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    try {
      const result = await firstValueFrom(this.ticketService.scanTicket(qrToken));
      this.showResult({ ...result, message: this.translateScanMessage(result.message) });
    } catch (error: unknown) {
      const message = this.translateScanMessage(
        this.extractErrorMessage(error),
      );
      this.showResult({ success: false, message });
    } finally {
      this.isSubmitting = false;
    }
  }

  private translateScanMessage(message: string): string {
    switch (message) {
      case 'Check-in successful':
        return this.i18n.t('scanner.messageCheckinSuccess');
      case 'Invalid QR Code':
        return this.i18n.t('scanner.messageInvalidQr');
      case 'This event has already finished and the QR code is no longer valid':
        return this.i18n.t('scanner.messageEventFinished');
      case 'Ticket already checked in':
        return this.i18n.t('scanner.messageAlreadyChecked');
      case 'Ticket has been cancelled':
        return this.i18n.t('scanner.messageCancelled');
      case 'You are not assigned to the event for this ticket':
        return this.i18n.t('scanner.messageNotAssigned');
      default:
        return message || this.i18n.t('scanner.messageScanFailed');
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const err = error as { error?: { error?: string } };
      return err.error?.error ?? 'Unable to scan QR token';
    }
    return 'Unable to scan QR token';
  }

  private showResult(result: TicketScanResult): void {
    this.scanResult = result;
    this.pauseScanner();
    this.clearResetTimer();
    // 7s for success (time to read details), 5s for error
    const delay = result.success ? 7000 : 5000;
    this.resetTimeoutId = window.setTimeout(() => {
      this.scanResult = null;
      this.manualToken = '';
      this.resumeScanner();
    }, delay);
  }  private pauseScanner(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private resumeScanner(): void {
    if (!this.cameraSupported || this.scanResult) {
      return;
    }
    // The <video> element stays mounted (hidden via CSS, not *ngIf), so the
    // stream survives across scans. Just re-attach defensively and restart
    // the frame loop.
    const video = this.videoRef?.nativeElement;
    if (video && this.stream && video.srcObject !== this.stream) {
      video.srcObject = this.stream;
    }
    if (video?.paused) {
      video.play().catch(() => this.scheduleFrame());
    }
    this.scheduleFrame();
  }

  private stopScanner(): void {
    this.pauseScanner();
    this.clearResetTimer();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  private clearResetTimer(): void {
    if (this.resetTimeoutId !== null) {
      window.clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  }
}
