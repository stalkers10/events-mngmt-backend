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
  /** Marketing feature rows. `key` maps to an i18n key under `billing.planFeatures.*`; */
  features: { key: string; available: boolean }[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, SubscriptionPlan> = {
  FREE: {
    code: 'FREE',
    name: 'Free',
    priceXaf: 0,
    interval: 'MONTHLY',
    limits: { buildings: 1, eventCreationsPerPeriod: 2, tablesPerEvent: 8 },
    features: [
      { key: 'buildings', available: true },
      { key: 'eventsPerMonth', available: true },
      { key: 'basicScan', available: true },
      { key: 'csvExport', available: false },
      { key: 'support', available: false },
    ],
  },
  GO: {
    code: 'GO',
    name: 'Go',
    priceXaf: 10,
    interval: 'MONTHLY',
    limits: { buildings: 3, eventCreationsPerPeriod: 15, tablesPerEvent: 13 },
    features: [
      { key: 'buildings', available: true },
      { key: 'eventsPerMonth', available: true },
      { key: 'gateStaff', available: true },
      { key: 'instantExport', available: true },
      { key: 'phoneSupport', available: false },
    ],
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    priceXaf: 15,
    interval: 'MONTHLY',
    limits: { buildings: null, eventCreationsPerPeriod: null, tablesPerEvent: null },
    features: [
      { key: 'unlimitedBuildings', available: true },
      { key: 'unlimitedEvents', available: true },
      { key: 'unlimitedStaffQr', available: true },
      { key: 'vipSuites', available: true },
      { key: 'concierge', available: true },
    ],
  },
};

export const PUBLIC_SUBSCRIPTION_PLANS = Object.values(SUBSCRIPTION_PLANS);

export function getSubscriptionPlan(code: SubscriptionPlanCode): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[code];
}
