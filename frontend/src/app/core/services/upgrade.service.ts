import { Injectable, signal } from '@angular/core';

export type PlanLimitFeature = 'BUILDING' | 'EVENT_CREATION' | 'TABLE';

export interface UpgradeInfo {
  feature: PlanLimitFeature;
  reason: string;
  limit: number;
  used: number;
  remaining: number;
}

@Injectable({ providedIn: 'root' })
export class UpgradeService {
  /** Null when no upgrade prompt is visible. */
  readonly state = signal<UpgradeInfo | null>(null);

  show(info: UpgradeInfo): void {
    this.state.set(info);
  }

  close(): void {
    this.state.set(null);
  }
}
