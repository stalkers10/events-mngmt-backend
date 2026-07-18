import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  /** Drives the CSS transition: 'entering' -> 'visible' -> 'leaving' */
  state: 'entering' | 'visible' | 'leaving';
}

const VISIBLE_DURATION_MS = 5000;
const TRANSITION_DURATION_MS = 300;

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(type: ToastType, message: string): void {
    const id = nextId++;
    const toast: Toast = { id, type, message, state: 'entering' };

    this.toasts.update((list) => [...list, toast]);

    // Next tick: flip to 'visible' so the CSS transition actually animates
    // (adding an already-visible element skips the enter transition).
    setTimeout(() => this.setState(id, 'visible'), 20);

    // After the visible duration, start the exit transition.
    setTimeout(() => this.setState(id, 'leaving'), VISIBLE_DURATION_MS);

    // After the exit transition finishes, remove it from the list entirely.
    setTimeout(
      () => this.remove(id),
      VISIBLE_DURATION_MS + TRANSITION_DURATION_MS
    );
  }

  error(message: string): void {
    this.show('error', message);
  }

  success(message: string): void {
    this.show('success', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.setState(id, 'leaving');
    setTimeout(() => this.remove(id), TRANSITION_DURATION_MS);
  }

  private setState(id: number, state: Toast['state']): void {
    this.toasts.update((list) => list.map((t) => (t.id === id ? { ...t, state } : t)));
  }

  private remove(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
