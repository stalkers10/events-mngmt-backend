import { Component, Input, Output, EventEmitter, signal, ElementRef, HostListener, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  value: any;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
})
export class CustomSelectComponent {
  @Input() options: SelectOption[] = [];
  @Input() selected: any = null;
  @Input() placeholder = 'Select…';
  @Input() fullWidth = false;
  @Output() selectedChange = new EventEmitter<any>();

  @HostBinding('class.full-width') get hostFullWidth(): boolean {
    return this.fullWidth;
  }

  readonly open = signal(false);

  get selectedOption(): SelectOption | undefined {
    return this.options.find((o) => o.value === this.selected);
  }

  get displayLabel(): string {
    return this.selectedOption?.label ?? this.placeholder;
  }

  get isPlaceholder(): boolean {
    return !this.selectedOption;
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  select(opt: SelectOption): void {
    this.selectedChange.emit(opt.value);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  constructor(private host: ElementRef) {}
}
