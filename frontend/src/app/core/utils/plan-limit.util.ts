import { UpgradeInfo, PlanLimitFeature } from '../services/upgrade.service';

/**
 * Extracts structured plan-limit information from an HTTP error, or null when
 * the error is unrelated to subscription quotas.
 */
export function planLimitFromError(err: any): UpgradeInfo | null {
  const payload = err?.error ?? err;
  if (!payload || payload.code !== 'PLAN_LIMIT_REACHED') {
    return null;
  }
  const feature = (payload.feature as PlanLimitFeature) ?? 'BUILDING';
  return {
    feature,
    reason: payload.error ?? payload.message ?? 'Plan limit reached. Upgrade your plan to continue.',
    limit: typeof payload.limit === 'number' ? payload.limit : 0,
    used: typeof payload.used === 'number' ? payload.used : 0,
    remaining: typeof payload.remaining === 'number' ? payload.remaining : 0,
  };
}
