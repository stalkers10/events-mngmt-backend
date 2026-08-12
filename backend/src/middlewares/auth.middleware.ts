import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUser, RoleType } from '../types/auth';

/**
 * Verifies the JWT on the Authorization header and attaches the decoded
 * user to req.user. Rejects the request if the token is missing/invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to one or more roles. Must run AFTER requireAuth.
 */
export function requireRole(...allowedRoles: RoleType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}

/**
 * Resolves the effective clientId for the current request.
 *
 * - SUPER_ADMIN: returns undefined (no filter → sees everything)
 * - CLIENT_ADMIN: returns their own id (from JWT payload)
 * - GATE_STAFF: returns undefined (gate staff routes use assignment-based
 *   filtering, not client_id directly)
 *
 * Routes that need tenant isolation should call this and add
 * `WHERE client_id = $N` when the result is not undefined.
 */
export function resolveClientId(user: AuthenticatedUser): string | undefined {
  if (user.role === RoleType.CLIENT_ADMIN) {
    return user.clientId;
  }
  return undefined;
}
