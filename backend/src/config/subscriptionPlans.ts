/**
 * Product configuration for all subscription plans.
 *
 * Edit this file to change a plan's public name, limits, or XAF price. These
 * values are deliberately not stored in .env: unlike credentials, they are
 * product rules that benefit from code review and version history. CamPay
 * credentials will be added to .env during the payment integration phase.
 */
export type SubscriptionPlanCode = 'FREE' | 'GO' | 'PRO';

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

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, SubscriptionPlan> = {
  FREE: {
    code: 'FREE',
    name: 'Free',
    priceXaf: 0,
    interval: 'MONTHLY',
    limits: { buildings: 1, eventCreationsPerPeriod: 2, tablesPerEvent: 8 },
    features: ['Venue management', 'Event seating', 'QR tickets', 'Gate check-in'],
  },
  GO: {
    code: 'GO',
    name: 'Go',
    priceXaf: 10,
    interval: 'MONTHLY',
    limits: { buildings: 3, eventCreationsPerPeriod: 4, tablesPerEvent: 13 },
    features: ['Everything in Free', 'Up to 3 buildings', '4 event creations per month', 'Up to 13 tables per event'],
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    priceXaf: 15,
    interval: 'MONTHLY',
    limits: { buildings: null, eventCreationsPerPeriod: null, tablesPerEvent: null },
    features: ['Everything in Go', 'Unlimited buildings', 'Unlimited event creation', 'Unlimited tables per event'],
  },
};

export const PUBLIC_SUBSCRIPTION_PLANS = Object.values(SUBSCRIPTION_PLANS);

export function getSubscriptionPlan(code: SubscriptionPlanCode): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[code];
}
