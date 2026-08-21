import { PoolClient } from 'pg';
import { getSubscriptionPlan, SubscriptionPlan, SubscriptionPlanCode } from '../config/subscriptionPlans';

type SubscriptionStatus = 'FREE' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCEL_AT_PERIOD_END' | 'EXPIRED';

interface SubscriptionForEntitlement {
  plan_code: SubscriptionPlanCode;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date | null;
}

export type PlanLimitFeature = 'BUILDING' | 'EVENT_CREATION' | 'TABLE';

export interface PlanLimitDetails {
  feature: PlanLimitFeature;
  limit: number;
  used: number;
  remaining: number;
}

export class SubscriptionLimitError extends Error {
  statusCode = 403;
  code = 'PLAN_LIMIT_REACHED';
  details: PlanLimitDetails;

  constructor(message: string, details: PlanLimitDetails) {
    super(message);
    this.details = details;
  }
}

/** Returns plan-limit metadata from an error, or null if it isn't a limit error. */
export function planLimitMeta(err: any): PlanLimitDetails | null {
  if (err && err.code === 'PLAN_LIMIT_REACHED' && err.details) {
    return err.details as PlanLimitDetails;
  }
  return null;
}

/**
 * Transactional subscription checks. These are deliberately backend-only;
 * Angular may display quotas but never decides whether a resource may exist.
 */
export const EntitlementsService = {
  async assertCanCreateBuilding(client: PoolClient, clientId: string): Promise<void> {
    const subscription = await getLockedSubscription(client, clientId);
    const limit = effectivePlan(subscription).limits.buildings;
    if (limit === null) return;

    const count = await client.query<{ count: string }>(
      `SELECT COUNT(*) FROM buildings WHERE client_id = $1`,
      [clientId],
    );
    const used = Number(count.rows[0].count);
    if (used >= limit) {
      throw new SubscriptionLimitError(
        `Your ${effectivePlan(subscription).name} plan allows up to ${limit} building${limit === 1 ? '' : 's'}. You currently have ${used}. Upgrade to create another building.`,
        { feature: 'BUILDING', limit, used, remaining: 0 },
      );
    }
  },

  async assertCanCreateEvent(client: PoolClient, clientId: string): Promise<SubscriptionForEntitlement> {
    const subscription = await getLockedSubscription(client, clientId);
    const limit = effectivePlan(subscription).limits.eventCreationsPerPeriod;
    if (limit === null) return subscription;

    const count = await client.query<{ count: string }>(
      `SELECT COUNT(*) FROM subscription_usage_ledger
       WHERE client_id = $1 AND usage_type = 'EVENT_CREATION' AND period_start = $2`,
      [clientId, subscription.current_period_start],
    );
    const used = Number(count.rows[0].count);
    if (used >= limit) {
      throw new SubscriptionLimitError(
        `Your ${effectivePlan(subscription).name} plan allows ${limit} event creation${limit === 1 ? '' : 's'} per billing period. You've used ${used}. Upgrade to create another event.`,
        { feature: 'EVENT_CREATION', limit, used, remaining: 0 },
      );
    }
    return subscription;
  },

  async recordEventCreation(client: PoolClient, clientId: string, eventId: string, subscription: SubscriptionForEntitlement): Promise<void> {
    await client.query(
      `INSERT INTO subscription_usage_ledger (client_id, usage_type, resource_id, period_start)
       VALUES ($1, 'EVENT_CREATION', $2, $3)`,
      [clientId, eventId, subscription.current_period_start],
    );
  },

  async assertCanAddTables(client: PoolClient, clientId: string, eventId: string, requestedTableCount: number): Promise<void> {
    const subscription = await getLockedSubscription(client, clientId);
    const limit = effectivePlan(subscription).limits.tablesPerEvent;
    if (limit === null) return;

    const count = await client.query<{ count: string }>(
      `SELECT COUNT(*) FROM tables WHERE event_id = $1`,
      [eventId],
    );
    const used = Number(count.rows[0].count);
    const resultingCount = used + requestedTableCount;
    if (resultingCount > limit) {
      throw new SubscriptionLimitError(
        `Your ${effectivePlan(subscription).name} plan allows up to ${limit} tables per event. You currently have ${used}. Upgrade to add more tables.`,
        { feature: 'TABLE', limit, used, remaining: Math.max(0, limit - used) },
      );
    }
  },
};

async function getLockedSubscription(client: PoolClient, clientId: string): Promise<SubscriptionForEntitlement> {
  // Serializes quota decisions for one tenant, including simultaneous browser
  // requests, while leaving other tenants fully concurrent.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`subscription:${clientId}`]);
  const result = await client.query<SubscriptionForEntitlement>(
    `SELECT plan_code, status, current_period_start, current_period_end
     FROM subscriptions WHERE client_id = $1 FOR UPDATE`,
    [clientId],
  );
  if (result.rows.length === 0) {
    // Defensive fallback for a tenant created outside the normal ClientsService.
    await client.query(
      `INSERT INTO subscriptions (client_id, plan_code, status, price_xaf)
       VALUES ($1, 'FREE', 'FREE', 0)`,
      [clientId],
    );
    const created = await client.query<SubscriptionForEntitlement>(
      `SELECT plan_code, status, current_period_start, current_period_end
       FROM subscriptions WHERE client_id = $1 FOR UPDATE`,
      [clientId],
    );
    return created.rows[0];
  }
  const subscription = result.rows[0];
  if ((subscription.status === 'ACTIVE' || subscription.status === 'CANCEL_AT_PERIOD_END') && subscription.current_period_end && subscription.current_period_end <= new Date()) {
    await client.query(`UPDATE subscriptions SET plan_code = 'FREE', status = 'EXPIRED', cancel_at_period_end = false, current_period_end = NULL, price_xaf = 0, updated_at = NOW() WHERE client_id = $1`, [clientId]);
    return { ...subscription, plan_code: 'FREE', status: 'EXPIRED' };
  }
  return subscription;
}

function effectivePlan(subscription: SubscriptionForEntitlement): SubscriptionPlan {
  // A paid plan is usable only for an active paid period. Future payment work
  // controls these states; until then every tenant correctly remains Free.
  if (subscription.status === 'ACTIVE' || subscription.status === 'CANCEL_AT_PERIOD_END') {
    return getSubscriptionPlan(subscription.plan_code);
  }
  return getSubscriptionPlan('FREE');
}
