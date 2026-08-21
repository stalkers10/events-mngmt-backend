export type SubscriptionPlanCode = 'FREE' | 'GO' | 'PRO';
export type SubscriptionStatus = 'FREE' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCEL_AT_PERIOD_END' | 'EXPIRED';

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  priceXaf: number | null;
  interval: 'MONTHLY';
  limits: {
    buildings: number | null;
    eventCreationsPerPeriod: number | null;
    tablesPerEvent: number | null;
  };
  features: string[];
}

export interface SubscriptionSummary {
  id: string;
  clientId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionUsage {
  buildings: { used: number; limit: number | null };
  eventCreations: { used: number; limit: number | null; periodStart: string };
}
