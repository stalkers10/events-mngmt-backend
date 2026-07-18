import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

const attempts = new Map<string, AttemptRecord>();

/**
 * Simple in-memory rate limiter keyed by IP + route.
 * Good enough for a single-VPS deployment; replace with a Redis-backed
 * limiter (e.g. rate-limiter-flexible) if this ever runs on multiple instances.
 */
export function rateLimit(options: { windowMs: number; max: number }) {
  const { windowMs, max } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const record = attempts.get(key);

    if (!record || now - record.firstAttemptAt > windowMs) {
      attempts.set(key, { count: 1, firstAttemptAt: now });
      return next();
    }

    if (record.count >= max) {
      const retryAfterSec = Math.ceil((record.firstAttemptAt + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    record.count += 1;
    next();
  };
}
