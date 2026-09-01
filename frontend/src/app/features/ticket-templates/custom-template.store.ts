import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
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

  delete(id: string): Observable<void> {
    return this.svc.deleteTemplate(id);
  }

  deleteMany(ids: string[]): Observable<void> {
    return new Observable<void>((subscriber) => {
      const queue = [...ids];
      const next = () => {
        if (queue.length === 0) {
          subscriber.next();
          subscriber.complete();
          return;
        }
        const id = queue.shift()!;
        this.svc.deleteTemplate(id).subscribe({ next: () => next(), error: (e) => subscriber.error(e) });
      };
      next();
    });
  }

  byId(id: string): any | undefined {
    return this.templates().find((t) => t.id === id);
  }
}
