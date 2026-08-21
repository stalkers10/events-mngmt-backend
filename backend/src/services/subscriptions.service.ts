import { query } from '../config/db';
import { getSubscriptionPlan, SubscriptionPlan, SubscriptionPlanCode } from '../config/subscriptionPlans';

export type SubscriptionStatus = 'FREE' | 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCEL_AT_PERIOD_END' | 'EXPIRED';

interface SubscriptionRow {
  id: string;
  client_id: string;
  plan_code: SubscriptionPlanCode;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  price_xaf: number;
}

export interface SubscriptionSummary {
  id: string;
  clientId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionUsage {
  buildings: { used: number; limit: number | null };
  eventCreations: { used: number; limit: number | null; periodStart: Date };
}

function toSummary(row: SubscriptionRow): SubscriptionSummary {
  return {
    id: row.id,
    clientId: row.client_id,
    status: row.status,
    plan: getSubscriptionPlan(row.plan_code),
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

export const SubscriptionsService = {
  async expirePaidSubscriptions(clientId?: string): Promise<number> {
    const result = await query(
      `UPDATE subscriptions
       SET plan_code = 'FREE', status = 'EXPIRED', cancel_at_period_end = false,
           current_period_end = NULL, price_xaf = 0, updated_at = NOW()
       WHERE plan_code IN ('GO', 'PRO')
         AND status IN ('ACTIVE', 'CANCEL_AT_PERIOD_END', 'PAST_DUE')
         AND current_period_end IS NOT NULL
         AND current_period_end <= NOW()
         ${clientId ? 'AND client_id = $1' : ''}`,
      clientId ? [clientId] : [],
    );
    return result.rowCount ?? 0;
  },
  async ensureFreeSubscription(clientId: string): Promise<SubscriptionSummary> {
    await query(
      `INSERT INTO subscriptions (client_id, plan_code, status, price_xaf)
       VALUES ($1, 'FREE', 'FREE', 0)
       ON CONFLICT (client_id) DO NOTHING`,
      [clientId],
    );
    return this.getForClient(clientId);
  },

  async getForClient(clientId: string): Promise<SubscriptionSummary> {
    await this.expirePaidSubscriptions(clientId);
    const result = await query<SubscriptionRow>(
      `SELECT id, client_id, plan_code, status, current_period_start,
              current_period_end, cancel_at_period_end, price_xaf
       FROM subscriptions WHERE client_id = $1`,
      [clientId],
    );
    if (result.rows.length === 0) {
      return this.ensureFreeSubscription(clientId);
    }
    return toSummary(result.rows[0]);
  },

  async cancelAtPeriodEnd(clientId: string): Promise<SubscriptionSummary> {
    const result = await query<SubscriptionRow>(
      `UPDATE subscriptions
       SET status = 'CANCEL_AT_PERIOD_END', cancel_at_period_end = true, updated_at = NOW()
       WHERE client_id = $1 AND plan_code IN ('GO', 'PRO')
         AND status = 'ACTIVE' AND current_period_end > NOW()
       RETURNING id, client_id, plan_code, status, current_period_start,
                 current_period_end, cancel_at_period_end, price_xaf`,
      [clientId],
    );
    if (result.rows.length === 0) {
      throw Object.assign(new Error('There is no active paid subscription to cancel'), { statusCode: 409 });
    }
    return toSummary(result.rows[0]);
  },

  async resumeRenewal(clientId: string): Promise<SubscriptionSummary> {
    const result = await query<SubscriptionRow>(
      `UPDATE subscriptions
       SET status = 'ACTIVE', cancel_at_period_end = false, updated_at = NOW()
       WHERE client_id = $1 AND status = 'CANCEL_AT_PERIOD_END'
         AND current_period_end > NOW()
       RETURNING id, client_id, plan_code, status, current_period_start,
                 current_period_end, cancel_at_period_end, price_xaf`,
      [clientId],
    );
    if (result.rows.length === 0) {
      throw Object.assign(new Error('There is no pending cancellation to resume'), { statusCode: 409 });
    }
    return toSummary(result.rows[0]);
  },

  async getUsageForClient(clientId: string): Promise<SubscriptionUsage> {
    const subscription = await this.getForClient(clientId);
    const [buildingResult, eventUsageResult] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM buildings WHERE client_id = $1`, [clientId]),
      query<{ count: string }>(
        `SELECT COUNT(*) FROM subscription_usage_ledger
         WHERE client_id = $1 AND usage_type = 'EVENT_CREATION' AND period_start = $2`,
        [clientId, subscription.currentPeriodStart],
      ),
    ]);
    return {
      buildings: { used: Number(buildingResult.rows[0].count), limit: subscription.plan.limits.buildings },
      eventCreations: {
        used: Number(eventUsageResult.rows[0].count),
        limit: subscription.plan.limits.eventCreationsPerPeriod,
        periodStart: subscription.currentPeriodStart,
      },
    };
  },

  /**
   * Support intervention: directly set a client's subscription (plan, status,
   * and duration) without going through CamPay. Used by Super Admins to grant
   * or adjust a plan manually. For paid plans the period end is now + periodMonths.
   */
  async grantOrUpdate(
    clientId: string,
    planCode: SubscriptionPlanCode,
    opts: { status?: SubscriptionStatus; periodMonths?: number; priceXaf?: number } = {},
  ): Promise<SubscriptionSummary> {
    const plan = getSubscriptionPlan(planCode);
    const status = opts.status ?? (planCode === 'FREE' ? 'FREE' : 'ACTIVE');
    const now = new Date();
    let end: Date | null = null;
    if (planCode !== 'FREE') {
      end = new Date(now);
      end.setMonth(end.getMonth() + (opts.periodMonths ?? 1));
    }
    const result = await query<SubscriptionRow>(
      `INSERT INTO subscriptions (client_id, plan_code, status, current_period_start, current_period_end, price_xaf)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (client_id) DO UPDATE SET
         plan_code = EXCLUDED.plan_code,
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         price_xaf = EXCLUDED.price_xaf,
         cancel_at_period_end = false,
         updated_at = NOW()
       RETURNING id, client_id, plan_code, status, current_period_start,
               current_period_end, cancel_at_period_end, price_xaf`,
      [clientId, planCode, status, now, end, opts.priceXaf ?? plan.priceXaf ?? 0],
    );
    return toSummary(result.rows[0]);
  },
};
