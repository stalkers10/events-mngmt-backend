import { Injectable, inject, signal } from '@angular/core';
import { TicketTemplateService } from './ticket-template.service';

@Injectable({ providedIn: 'root' })
export class CustomTemplateStore {
  private readonly svc = inject(TicketTemplateService);

  readonly templates = signal<any[]>([]);
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.svc.listTemplates().subscribe({
      next: (list: any[]) => this.templates.set(list ?? []),
      error: () => this.templates.set([]),
    });
  }

  refresh(): void {
    this.loaded = false;
    this.load();
  }

  byId(id: string): any | undefined {
    return this.templates().find((t) => t.id === id);
  }
}
