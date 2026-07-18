import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  iconFor(type: string): string {
    switch (type) {
      case 'error':
        return 'error';
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
