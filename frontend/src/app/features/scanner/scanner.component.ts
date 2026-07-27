import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-page">
      <h1 class="text-headline-md">Scanner</h1>
      <p class="text-body-sm">.</p>
    </div>
  `,
  styles: [`
    .placeholder-page {
      padding: var(--space-xl);
    }
  `],
})
export class ScannerComponent {}
